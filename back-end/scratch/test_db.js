
import mysql from 'mysql2/promise';

async function test() {
  console.log('Testing connection to 127.0.0.1:3306...');
  try {
    const connection = await mysql.createConnection({
      host: '127.0.0.1',
      port: 3306,
      user: 'root',
      password: '',
      connectTimeout: 5000
    });
    console.log('Connected successfully!');
    await connection.end();
  } catch (err) {
    console.error('Connection failed:', err);
  }
}

test();

