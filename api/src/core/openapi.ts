export const openApiDocument = {
  openapi: '3.1.0',
  info: { title: 'Mahfil Fund API', version: '2.0.0', description: 'API-owned authentication and path-scoped multi-tenant operations.' },
  servers: [{ url: '/' }],
  components: {
    securitySchemes: { bearerAuth: { type: 'http', scheme: 'bearer', bearerFormat: 'JWT' } },
    schemas: {
      Error: { type: 'object', required: ['code', 'message'], properties: { code: { type: 'string' }, message: { type: 'string' } } },
      Login: { type: 'object', required: ['email', 'password'], properties: { email: { type: 'string', format: 'email' }, password: { type: 'string' } } },
      CompleteFirstLogin: { type: 'object', required: ['challengeToken', 'newPassword'], properties: { challengeToken: { type: 'string' }, newPassword: { type: 'string', minLength: 10 } } },
      MemberCreate: { oneOf: [
        { type: 'object', required: ['kind', 'email', 'fullName', 'temporaryPassword', 'role'], properties: { kind: { const: 'new' }, email: { type: 'string', format: 'email' }, fullName: { type: 'string' }, temporaryPassword: { type: 'string', minLength: 10 }, role: { enum: ['admin', 'collector', 'viewer'] } } },
        { type: 'object', required: ['kind', 'email', 'role'], properties: { kind: { const: 'existing' }, email: { type: 'string', format: 'email' }, role: { enum: ['admin', 'collector', 'viewer'] } } },
      ] },
    },
  },
  paths: {
    '/health': { get: { operationId: 'health', responses: { '200': { description: 'Healthy' } } } },
    '/auth/login': { post: { operationId: 'login', requestBody: { required: true, content: { 'application/json': { schema: { $ref: '#/components/schemas/Login' } } } }, responses: { '200': { description: 'Session or password-change challenge' }, '401': { description: 'Invalid credentials' } } } },
    '/auth/complete-first-login': { post: { operationId: 'completeFirstLogin', requestBody: { required: true, content: { 'application/json': { schema: { $ref: '#/components/schemas/CompleteFirstLogin' } } } }, responses: { '200': { description: 'Session created' } } } },
    '/auth/forgot-password': { post: { operationId: 'forgotPassword', responses: { '200': { description: 'Non-enumerating recovery response' } } } },
    '/auth/reset-password': { post: { operationId: 'resetPassword', responses: { '200': { description: 'Password reset' } } } },
    '/auth/refresh': { post: { operationId: 'refreshSession', responses: { '200': { description: 'Rotated session' } } } },
    '/auth/logout': { post: { operationId: 'logout', responses: { '200': { description: 'Token family revoked' } } } },
    '/me': { get: { operationId: 'getMe', security: [{ bearerAuth: [] }], responses: { '200': { description: 'Current user and memberships' } } } },
    '/communities': { get: { operationId: 'listCommunities', security: [{ bearerAuth: [] }], responses: { '200': { description: 'Accessible communities' } } } },
    '/communities/{communityId}/members': {
      parameters: [{ name: 'communityId', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }],
      get: { operationId: 'listMembers', security: [{ bearerAuth: [] }], responses: { '200': { description: 'Community members' } } },
      post: { operationId: 'createMember', security: [{ bearerAuth: [] }], requestBody: { required: true, content: { 'application/json': { schema: { $ref: '#/components/schemas/MemberCreate' } } } }, responses: { '200': { description: 'Account and membership created' } } },
    },
    '/platform/users': { get: { operationId: 'listPlatformUsers', security: [{ bearerAuth: [] }], responses: { '200': { description: 'Super-admin account list' } } } },
    ...Object.fromEntries(['events', 'donors', 'donations', 'expenses', 'invoices', 'reports', 'uploads', 'sync', 'audit-logs', 'error-logs'].map((resource) => [
      `/communities/{communityId}/${resource}`,
      { parameters: [{ name: 'communityId', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }], get: { operationId: `list${resource}`, security: [{ bearerAuth: [] }], responses: { '200': { description: 'Tenant-scoped response' } } } },
    ])),
  },
} as const;
