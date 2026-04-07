import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Forms } from 'src/entities/forms.entity';
import * as fs from 'fs';
import * as path from 'path';
import { randomUUID } from 'crypto';

const UPLOAD_DIR = path.resolve(process.cwd(), 'uploads', 'forms');

const ALLOWED_MIME = [
  'application/pdf',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
];

@Injectable()
export class FormsService {
  constructor(
    @InjectRepository(Forms)
    private formsRepository: Repository<Forms>,
  ) {
    if (!fs.existsSync(UPLOAD_DIR)) {
      fs.mkdirSync(UPLOAD_DIR, { recursive: true });
    }
  }

  async findAll(): Promise<Forms[]> {
    return this.formsRepository.find();
  }

  async findByUser(userId: string): Promise<Forms[]> {
    return this.formsRepository.find({
      where: { userId },
      order: { createdAt: 'DESC' },
    });
  }

  async findOne(id: string): Promise<Forms> {
    const form = await this.formsRepository.findOne({ where: { id } });
    if (!form) throw new NotFoundException('Formularz nie znaleziony');
    return form;
  }

  async getFileStream(id: string) {
    const form = await this.findOne(id);
    if (!fs.existsSync(form.url)) {
      throw new NotFoundException('Plik nie istnieje na dysku');
    }
    return { form, stream: fs.createReadStream(form.url) };
  }

  async create(
    file: any,
    userId: string,
  ): Promise<Forms> {
    if (!file) throw new BadRequestException('Brak pliku');
    if (!userId) throw new BadRequestException('Brak userId');
    if (!ALLOWED_MIME.includes(file.mimetype)) {
      throw new BadRequestException('Nieprawidłowy typ pliku (PDF/DOCX)');
    }

    const id = randomUUID();
    const ext = path.extname(file.originalname) || '';
    const filePath = path.join(UPLOAD_DIR, `${id}${ext}`);
    fs.writeFileSync(filePath, file.buffer);

    const form = this.formsRepository.create({
      id,
      userId,
      name: file.originalname,
      url: filePath,
      mimetype: file.mimetype,
      size: file.size,
    });
    return this.formsRepository.save(form);
  }

  async delete(id: string): Promise<{ success: boolean }> {
    const form = await this.findOne(id);
    if (fs.existsSync(form.url)) {
      try {
        fs.unlinkSync(form.url);
      } catch (e) {
        // ignore fs error, still drop record
      }
    }
    await this.formsRepository.delete(id);
    return { success: true };
  }
}
