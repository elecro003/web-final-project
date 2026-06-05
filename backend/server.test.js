const request = require('supertest');
const app = require('./server'); // server.js에서 app을 export 해야 합니다. (module.exports = app;)

describe('서버 건강 검진 테스트', () => {
  it('기본 경로(/)로 요청을 보내면 200 상태 코드가 돌아와야 한다', async () => {
    const response = await request(app).get('/');
    expect(response.statusCode).toBe(200);
  });
});