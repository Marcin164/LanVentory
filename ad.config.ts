import { registerAs } from '@nestjs/config';

export default registerAs('ad', () => ({
  url: process.env.AD_URL,
  baseDN: process.env.AD_BASE_DN,
  username: process.env.AD_USERNAME,
  password: process.env.AD_PASSWORD,
}));
