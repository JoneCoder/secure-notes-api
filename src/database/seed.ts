import { NestFactory } from '@nestjs/core';
import { Logger } from '@nestjs/common';
import { AppModule } from '../app.module';
import { getModelToken } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import * as bcrypt from 'bcryptjs';
import { User, UserDocument } from '../users/schemas/user.schema';
import { Note, NoteDocument } from '../notes/schemas/note.schema';
import { Post, PostDocument } from '../posts/schemas/post.schema';
import { Role } from '../common/enums/role.enum';

async function seed() {
  const logger = new Logger('Seeder');
  const app = await NestFactory.createApplicationContext(AppModule);

  try {
    const userModel = app.get<Model<UserDocument>>(getModelToken(User.name));
    const noteModel = app.get<Model<NoteDocument>>(getModelToken(Note.name));
    const postModel = app.get<Model<PostDocument>>(getModelToken(Post.name));

    logger.log('Clearing existing collections...');
    await Promise.all([
      userModel.deleteMany({}),
      noteModel.deleteMany({}),
      postModel.deleteMany({}),
    ]);

    logger.log('Syncing and verifying indexes...');
    await Promise.all([
      userModel.syncIndexes(),
      noteModel.syncIndexes(),
      postModel.syncIndexes(),
    ]);

    logger.log('Creating users...');
    const salt = await bcrypt.genSalt(10);
    const adminPassword = await bcrypt.hash('Admin@123456', salt);
    const userPassword = await bcrypt.hash('User@123456', salt);

    const admin = await userModel.create({
      name: 'System Admin',
      email: 'admin@example.com',
      password: adminPassword,
      role: Role.ADMIN,
      interests: ['security', 'architecture', 'devops'],
    });

    const alice = await userModel.create({
      name: 'Alice Johnson',
      email: 'alice@example.com',
      password: userPassword,
      role: Role.USER,
      interests: ['chess', 'reading', 'tech'],
    });

    const bob = await userModel.create({
      name: 'Bob Smith',
      email: 'bob@example.com',
      password: userPassword,
      role: Role.USER,
      interests: ['reading', 'gaming', 'tech'],
    });

    const charlie = await userModel.create({
      name: 'Charlie Brown',
      email: 'charlie@example.com',
      password: userPassword,
      role: Role.USER,
      interests: ['chess', 'travel'],
    });

    logger.log('Creating sample notes...');
    await noteModel.insertMany([
      {
        title: 'Admin Infrastructure Security Checklist',
        content: 'Ensure all JWT keys are rotated, rate limiting is configured, and MongoDB indexes are strictly minimal.',
        userId: admin._id,
      },
      {
        title: 'Alice Private Note: Chess Openings',
        content: 'Study Sicilian Defense Najdorf Variation and Italian Game lines for upcoming weekend tournament.',
        userId: alice._id,
      },
      {
        title: 'Alice Private Note: Book Recommendations',
        content: 'Read "Designing Data-Intensive Applications" by Martin Kleppmann and "Clean Code".',
        userId: alice._id,
      },
      {
        title: 'Bob Gaming Backlog',
        content: 'Finish Elden Ring DLC and complete Factorio space age playthrough with friends.',
        userId: bob._id,
      },
      {
        title: 'Charlie Travel Itinerary',
        content: 'Flight booking to Kyoto and hiking trail preparation for Mount Fuji.',
        userId: charlie._id,
      },
    ]);

    logger.log('Creating sample posts for $lookup aggregation...');
    await postModel.insertMany([
      {
        title: 'Why MongoDB Indexing Strategy Matters',
        content: 'Without proper indexes on filter and sort keys, MongoDB performs full collection scans (COLLSCAN). Compound indexes following ESR provide optimal IXSCAN performance.',
        authorId: alice._id,
      },
      {
        title: 'Analyzing Aggregation Pipelines',
        content: 'Using single-pipeline lookups reduces network roundtrips compared to separate application-level joins.',
        authorId: alice._id,
      },
      {
        title: 'Gaming Performance on New Hardware',
        content: 'Benchmarking latency and frame times on contemporary hardware setups.',
        authorId: bob._id,
      },
      {
        title: 'Travel Photography Gear Tips',
        content: 'Minimalist camera lens guide for long backpacking trips.',
        authorId: charlie._id,
      },
    ]);

    logger.log('✅ Database seeded successfully!');
    logger.log('Admin Account: admin@example.com / Admin@123456');
    logger.log('User Accounts: alice@example.com, bob@example.com, charlie@example.com / User@123456');

    const userIndexes = await userModel.collection.indexes();
    const noteIndexes = await noteModel.collection.indexes();
    const postIndexes = await postModel.collection.indexes();

    logger.log(`Active User Indexes: ${JSON.stringify(userIndexes.map((i) => i.name))}`);
    logger.log(`Active Note Indexes: ${JSON.stringify(noteIndexes.map((i) => i.name))}`);
    logger.log(`Active Post Indexes: ${JSON.stringify(postIndexes.map((i) => i.name))}`);
  } catch (err) {
    logger.error('Error during seeding:', err);
  } finally {
    await app.close();
  }
}

seed();
