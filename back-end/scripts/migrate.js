import mysql from 'mysql2/promise';
import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function migrate() {
  const host = process.env.DB_HOST;
  const port = process.env.DB_PORT;
  const user = process.env.DB_USER;
  const password = process.env.DB_PASS;
  const database = process.env.DB_NAME;

  console.log('--------------------------------------------------');
  console.log('BẮT ĐẦU IMPORT BẢNG LÊN DATABASE CLOUD...');
  console.log(`Kết nối tới Host: ${host}:${port}`);
  console.log(`Database: ${database}`);
  console.log(`User: ${user}`);
  console.log('--------------------------------------------------');

  if (!host || host === '127.0.0.1') {
    console.error('LỖI: Bạn chưa cập nhật thông số Database Aiven vào file back-end/.env!');
    console.log('Vui lòng mở file back-end/.env và điền thông số kết nối của Aiven trước khi chạy lệnh này.');
    process.exit(1);
  }

  let connection;
  try {
    connection = await mysql.createConnection({
      host,
      port: Number(port),
      user,
      password,
      database,
      ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : undefined,
      multipleStatements: true // Cho phép chạy nhiều câu lệnh SQL cùng lúc
    });

    console.log('✅ Đã kết nối thành công tới Database Aiven!');

    // Đọc các file SQL
    const schemaSql = fs.readFileSync(path.resolve(__dirname, '../db/mysql_schema.sql'), 'utf8');
    const onboardingSql = fs.readFileSync(path.resolve(__dirname, '../db/mysql_onboarding.sql'), 'utf8');

    // Chạy mysql_schema.sql
    console.log('⏳ Đang chạy file mysql_schema.sql (Tạo bảng users và user_transactions)...');
    await connection.query(schemaSql);
    console.log('✅ Tạo bảng từ mysql_schema.sql THÀNH CÔNG!');

    // Chạy mysql_onboarding.sql
    console.log('⏳ Đang chạy file mysql_onboarding.sql (Tạo bảng user_onboarding và user_goals)...');
    await connection.query(onboardingSql);
    console.log('✅ Tạo bảng từ mysql_onboarding.sql THÀNH CÔNG!');

    console.log('--------------------------------------------------');
    console.log('🎉 Xong! Đã import toàn bộ các bảng lên Aiven MySQL thành công rực rỡ!');
    console.log('--------------------------------------------------');
  } catch (error) {
    console.error('❌ LỖI TRONG QUÁ TRÌNH IMPORT:', error.message);
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

migrate();
