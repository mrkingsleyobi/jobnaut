// Security tests for authentication middleware
const request = require('supertest');
const app = require('../index');

describe('Authentication Security Tests', () => {
  test('should reject requests without authorization header', async () => {
    const response = await request(app).get('/api/v1/user/profile').expect(401);

    expect(response.body.error).toBe('Unauthorized: No valid token provided');
  });

  test('should reject requests with invalid authorization header format', async () => {
    const response = await request(app)
      .get('/api/v1/user/profile')
      .set('Authorization', 'InvalidFormat')
      .expect(401);

    expect(response.body.error).toBe('Unauthorized: No valid token provided');
  });

  test('should reject requests with invalid bearer token', async () => {
    const response = await request(app)
      .get('/api/v1/user/profile')
      .set('Authorization', 'Bearer invalid-token')
      .expect(401);

    expect(response.body.error).toBe('Unauthorized: Invalid session');
  });

  test('should reject requests to skills endpoint without authentication', async () => {
    const response = await request(app)
      .post('/api/v1/user/skills')
      .send({ skills: ['JavaScript'] })
      .expect(401);

    expect(response.body.error).toBe('Unauthorized: No valid token provided');
  });

  test('should reject requests to skills endpoint with invalid token', async () => {
    const response = await request(app)
      .post('/api/v1/user/skills')
      .set('Authorization', 'Bearer invalid-token')
      .send({ skills: ['JavaScript'] })
      .expect(401);

    expect(response.body.error).toBe('Unauthorized: Invalid session');
  });

  test('should properly validate skills array in POST request', async () => {
    const response = await request(app)
      .post('/api/v1/user/skills')
      .set('Authorization', 'Bearer invalid-token')
      .send({ skills: 'not-an-array' })
      .expect(401);

    // Should still return auth error, not validation error
    expect(response.body.error).toBe('Unauthorized: Invalid session');
  });

  test('should properly validate skills array in DELETE request', async () => {
    const response = await request(app)
      .delete('/api/v1/user/skills')
      .set('Authorization', 'Bearer invalid-token')
      .send({ skills: 'not-an-array' })
      .expect(401);

    // Should still return auth error, not validation error
    expect(response.body.error).toBe('Unauthorized: Invalid session');
  });
});
