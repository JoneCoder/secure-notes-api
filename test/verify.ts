import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { AppModule } from '../src/app.module';
import { GlobalHttpExceptionFilter } from '../src/common/filters/http-exception.filter';
import { getModelToken } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { UserDocument } from '../src/users/schemas/user.schema';
import { NoteDocument } from '../src/notes/schemas/note.schema';
import { PostDocument } from '../src/posts/schemas/post.schema';

async function runVerification() {
  console.log('\n=============================================');
  console.log('  SECURE NOTES API - VERIFICATION SUITE');
  console.log('=============================================\n');

  const app = await NestFactory.create(AppModule, { logger: ['error', 'warn'] });
  app.setGlobalPrefix('api/v1');
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
    }),
  );
  app.useGlobalFilters(new GlobalHttpExceptionFilter());

  const server = await app.listen(8001);
  const baseUrl = 'http://localhost:8001/api/v1';

  let passed = 0;
  let failed = 0;

  async function test(name: string, fn: () => Promise<void>) {
    try {
      await fn();
      console.log(` ✅ PASS: ${name}`);
      passed++;
    } catch (err: any) {
      console.error(` ❌ FAIL: ${name}`);
      console.error(`    Details: ${err.message}`);
      failed++;
    }
  }

  function assert(condition: boolean, msg: string) {
    if (!condition) {
      throw new Error(msg);
    }
  }

  try {
    let adminToken = '';
    let adminId = '';
    let userToken = '';
    let userId = '';
    let user2Token = '';
    let userNoteId = '';

    // 1. Auth: Login Admin
    await test('POST /api/auth/login (Admin)', async () => {
      const res = await fetch(`${baseUrl}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: 'admin@example.com',
          password: 'Admin@123456',
        }),
      });
      const data = await res.json();
      assert(res.status === 200, `Expected status 200, got ${res.status}`);
      assert(data.accessToken, 'Access token missing');
      assert(data.user.role === 'admin', 'Expected role admin');
      assert(data.user.password === undefined, 'Password hash must never be returned');
      adminToken = data.accessToken;
      adminId = data.user._id;
    });

    // 2. Auth: Login User
    await test('POST /api/auth/login (User Alice)', async () => {
      const res = await fetch(`${baseUrl}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: 'alice@example.com',
          password: 'User@123456',
        }),
      });
      const data = await res.json();
      assert(res.status === 200, `Expected status 200, got ${res.status}`);
      assert(data.user.role === 'user', 'Expected role user');
      assert(data.user.password === undefined, 'Password hash must never be returned');
      userToken = data.accessToken;
      userId = data.user._id;
    });

    // 3. Auth: Login User 2 (Bob)
    await test('POST /api/auth/login (User Bob)', async () => {
      const res = await fetch(`${baseUrl}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: 'bob@example.com',
          password: 'User@123456',
        }),
      });
      const data = await res.json();
      assert(res.status === 200, `Expected status 200, got ${res.status}`);
      user2Token = data.accessToken;
    });

    // 4. Auth: Get Current Profile
    await test('GET /api/auth/me (Current Profile)', async () => {
      const res = await fetch(`${baseUrl}/auth/me`, {
        headers: { Authorization: `Bearer ${userToken}` },
      });
      const data = await res.json();
      assert(res.status === 200, `Expected status 200, got ${res.status}`);
      assert(data.email === 'alice@example.com', 'Unexpected email');
      assert(data.password === undefined, 'Password must not be returned');
    });

    // 5. Auth: Register
    await test('POST /api/auth/register (New User)', async () => {
      const testEmail = `user_${Date.now()}@example.com`;
      const res = await fetch(`${baseUrl}/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: 'New Registered User',
          email: testEmail,
          password: 'UserPassword@123',
          interests: ['books', 'ai'],
        }),
      });
      const data = await res.json();
      assert(res.status === 201, `Expected status 201, got ${res.status}`);
      assert(data.user.role === 'user', 'New user role must default to user');
      assert(data.accessToken, 'Access token must be returned');
    });

    // 6. RBAC: Regular user blocked from admin endpoint
    await test('RBAC Guard: Regular user access to /api/admin/users blocked (403)', async () => {
      const res = await fetch(`${baseUrl}/admin/users`, {
        headers: { Authorization: `Bearer ${userToken}` },
      });
      assert(res.status === 403, `Expected status 403, got ${res.status}`);
    });

    // 7. RBAC: Admin can list all users with pagination
    await test('GET /api/admin/users (Admin access with pagination)', async () => {
      const res = await fetch(`${baseUrl}/admin/users?page=1&limit=5`, {
        headers: { Authorization: `Bearer ${adminToken}` },
      });
      const data = await res.json();
      assert(res.status === 200, `Expected status 200, got ${res.status}`);
      assert(Array.isArray(data.data), 'Expected data to be array');
      assert(data.meta && data.meta.total > 0, 'Expected pagination meta');
    });

    // 8. Notes CRUD: User creates note
    await test('POST /api/notes (User creates private note)', async () => {
      const res = await fetch(`${baseUrl}/notes`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${userToken}`,
        },
        body: JSON.stringify({
          title: 'Alice Confidential Research Note',
          content: 'Secret database optimization findings.',
        }),
      });
      const data = await res.json();
      assert(res.status === 201, `Expected status 201, got ${res.status}`);
      assert(data._id, 'Missing note _id');
      assert(data.userId === userId, 'Note userId must match creator');
      userNoteId = data._id;
    });

    // 9. Notes: User lists their own notes with pagination
    await test('GET /api/notes (User lists own notes with pagination)', async () => {
      const res = await fetch(`${baseUrl}/notes?page=1&limit=10`, {
        headers: { Authorization: `Bearer ${userToken}` },
      });
      const data = await res.json();
      assert(res.status === 200, `Expected status 200, got ${res.status}`);
      assert(Array.isArray(data.data), 'Expected array of notes');
      assert(data.data.every((n: any) => n.userId === userId), 'All notes must belong to user');
      assert(data.meta && data.meta.page === 1, 'Missing meta pagination');
    });

    // 10. Notes Security: Bob cannot edit or delete Alice note
    await test('Notes Security: User Bob cannot edit Alice note (403)', async () => {
      const res = await fetch(`${baseUrl}/notes/${userNoteId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${user2Token}`,
        },
        body: JSON.stringify({ title: 'Tampered Note Title' }),
      });
      assert(res.status === 403, `Expected status 403 Forbidden, got ${res.status}`);
    });

    // 11. Admin view: Admin can list all notes across users
    await test('GET /api/admin/notes (Admin views all notes across platform)', async () => {
      const res = await fetch(`${baseUrl}/admin/notes?page=1&limit=10`, {
        headers: { Authorization: `Bearer ${adminToken}` },
      });
      const data = await res.json();
      assert(res.status === 200, `Expected status 200, got ${res.status}`);
      assert(data.data.length > 0, 'Expected notes list');
      assert(data.meta && data.meta.total > 0, 'Expected total notes count');
    });

    // 12. Aggregation Scenario 1: Group by Interests
    await test('Scenario 1 Aggregation: GET /api/admin/users/group-by-interests', async () => {
      const res = await fetch(`${baseUrl}/admin/users/group-by-interests`, {
        headers: { Authorization: `Bearer ${adminToken}` },
      });
      const data = await res.json();
      assert(res.status === 200, `Expected status 200, got ${res.status}`);
      assert(Array.isArray(data), 'Expected array response');
      assert(data.length > 0, 'Expected grouped interests');

      const chessGroup = data.find((g: any) => g.interest === 'chess');
      assert(chessGroup !== undefined, 'Expected "chess" group in results');
      assert(chessGroup.userCount >= 2, 'Expected at least 2 users with chess interest');
      assert(Array.isArray(chessGroup.users), 'Expected users array under group');
    });

    // 13. Aggregation Scenario 2: User Posts ($lookup)
    await test('Scenario 2 Aggregation: GET /api/users/:id/posts ($lookup)', async () => {
      const res = await fetch(`${baseUrl}/users/${userId}/posts`);
      const data = await res.json();
      assert(res.status === 200, `Expected status 200, got ${res.status}`);
      assert(data._id === userId, 'Expected matching user ID');
      assert(Array.isArray(data.posts), 'Expected posts array from $lookup');
      assert(data.posts.length > 0, 'Expected posts to be populated');
      assert(data.posts.every((p: any) => p.authorId === userId), 'All posts must match user');
      assert(data.password === undefined, 'User password must not be returned');
    });

    // 14. Admin Safety Protections: Cannot delete own account
    await test('Admin Protection: Admin cannot delete own account (400)', async () => {
      const res = await fetch(`${baseUrl}/admin/users/${adminId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${adminToken}` },
      });
      assert(res.status === 400, `Expected 400 Bad Request, got ${res.status}`);
    });

    // 15. MongoDB Index Explain Plan Verification
    await test('MongoDB Indexes: Explain Plan IXSCAN Verification', async () => {
      const noteModel = app.get<Model<NoteDocument>>(getModelToken('Note'));
      const userModel = app.get<Model<UserDocument>>(getModelToken('User'));
      const postModel = app.get<Model<PostDocument>>(getModelToken('Post'));

      function hasStage(node: any, targetStage: string): boolean {
        if (!node) return false;
        if (node.stage === targetStage) return true;
        if (node.inputStage && hasStage(node.inputStage, targetStage)) return true;
        if (Array.isArray(node.inputStages)) {
          return node.inputStages.some((s: any) => hasStage(s, targetStage));
        }
        return false;
      }

      // 1. Verify Note listing query uses IXSCAN on { userId: 1, createdAt: -1 }
      const noteExplain: any = await noteModel
        .find({ userId: userId as any })
        .sort({ createdAt: -1 })
        .explain('executionStats');

      const noteHasIxScan = hasStage(noteExplain.executionStats?.executionStages, 'IXSCAN');
      console.log(`    Note Query has IXSCAN: ${noteHasIxScan}`);
      assert(noteHasIxScan, 'Expected IXSCAN for note find query with sort');

      // 2. Verify User email query uses IXSCAN
      const userExplain: any = await userModel
        .findOne({ email: 'alice@example.com' })
        .explain('executionStats');

      const userHasIxScan = hasStage(userExplain.executionStats?.executionStages, 'IXSCAN');
      console.log(`    User Query has IXSCAN: ${userHasIxScan}`);
      assert(userHasIxScan, 'Expected IXSCAN for email query');

      // 3. Verify Post authorId query uses IXSCAN
      const postExplain: any = await postModel
        .find({ authorId: userId as any })
        .sort({ createdAt: -1 })
        .explain('executionStats');

      const postHasIxScan = hasStage(postExplain.executionStats?.executionStages, 'IXSCAN');
      console.log(`    Post Query has IXSCAN: ${postHasIxScan}`);
      assert(postHasIxScan, 'Expected IXSCAN for authorId query');
    });

  } finally {
    await app.close();
  }

  console.log('\n=============================================');
  console.log(`  VERIFICATION RESULTS: ${passed} PASSED, ${failed} FAILED`);
  console.log('=============================================\n');

  if (failed > 0) {
    process.exit(1);
  }
}

runVerification();
