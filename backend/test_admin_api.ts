import { PrismaClient } from './src/generated/prisma/client';
import axios from 'axios';

async function test() {
  try {
    const res = await axios.post('http://localhost:5000/api/v1/auth/login', {
      email: 'admin@ecommerce.com',
      password: 'admin123'
    });
    const token = res.data.data.tokens.accessToken;
    const axiosCfg = { headers: { Authorization: `Bearer ${token}` } };
    
    console.log('Testing /api/v1/admin/dashboard...')
    await axios.get('http://localhost:5000/api/v1/admin/dashboard', axiosCfg)
      .then(r => console.log('✅ Dashboard OK'))
      .catch(e => console.log('❌ Dashboard ERROR:', e.response?.data || e.message));
      
    console.log('Testing /api/v1/admin/revenue...')
    await axios.get('http://localhost:5000/api/v1/admin/revenue?period=day', axiosCfg)
      .then(r => console.log('✅ Revenue OK'))
      .catch(e => console.log('❌ Revenue ERROR:', e.response?.data || e.message));
      
    console.log('Testing /api/v1/admin/orders...')
    await axios.get('http://localhost:5000/api/v1/admin/orders?limit=5', axiosCfg)
      .then(r => console.log('✅ Orders OK'))
      .catch(e => console.log('❌ Orders ERROR:', e.response?.data || e.message));

  } catch(e: any) {
    console.log('Login failed', e.response?.data || e.message);
  }
}
test();
