# Data Model — Planster

Source of truth for the Prisma schema. When this file is modified, run:
```bash
npx prisma migrate dev --name <descripcion>
npx prisma generate
```

## Schema completo (`prisma/schema.prisma`)

```prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider  = "postgresql"
  url       = env("DATABASE_URL")   // Supabase pooler (Transaction mode, port 6543)
  directUrl = env("DIRECT_URL")     // direct connection for migrations (port 5432)
}

// ─── USERS ──────────────────────────────────────────────────────────────────

model User {
  id          String   @id @default(cuid())
  email       String   @unique
  password    String   // bcrypt hashed
  googleId    String?  @unique
  username    String   @unique
  displayName String
  bio         String?  @db.VarChar(300)
  avatarUrl   String?
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  // Relaciones
  books            Book[]
  betaReaderships  BetaReader[]
  library          Library[]
  shelves          Shelf[]
  writingGoals     WritingGoal[]
  wordCountLogs    WordCountLog[]
  notifications    Notification[]
  commentReplies   CommentReply[]
  accounts         Account[]      // NextAuth
  sessions         Session[]      // NextAuth
}

// NextAuth adapters (required — do not modify)
model Account {
  id                String  @id @default(cuid())
  userId            String
  type              String
  provider          String
  providerAccountId String
  refresh_token     String? @db.Text
  access_token      String? @db.Text
  expires_at        Int?
  token_type        String?
  scope             String?
  id_token          String? @db.Text
  session_state     String?
  user              User    @relation(fields: [userId], references: [id], onDelete: Cascade)
  @@unique([provider, providerAccountId])
}

model Session {
  id           String   @id @default(cuid())
  sessionToken String   @unique
  userId       String
  expires      DateTime
  user         User     @relation(fields: [userId], references: [id], onDelete: Cascade)
}

model VerificationToken {
  identifier String
  token      String   @unique
  expires    DateTime
  @@unique([identifier, token])
}

// ─── BOOKS & CHAPTERS ───────────────────────────────────────────────────────

enum PublicationStatus {
  DRAFT      // private draft
  BETA       // closed beta
  PUBLISHED  // published for all
}

enum BookStatus {
  IN_PROGRESS
  COMPLETE
  PAUSED
}

model Book {
  id                String            @id @default(cuid())
  authorId          String
  title             String
  synopsis          String?           @db.VarChar(2000)
  coverUrl          String?
  genres            String[]
  tags              String[]
  language          String            @default("es")
  publicationStatus PublicationStatus @default(DRAFT)
  bookStatus        BookStatus        @default(IN_PROGRESS)
  createdAt         DateTime          @default(now())
  updatedAt         DateTime          @updatedAt

  author       User          @relation(fields: [authorId], references: [id])
  chapters     Chapter[]
  betaReaders  BetaReader[]
  library      Library[]
  characters   Character[]
  locations    Location[]
  timelineEntries TimelineEntry[]
  boards       Board[]
  bookNotes    BookNote[]
  writingGoals WritingGoal[]
}

model Chapter {
  id         String            @id @default(cuid())
  bookId     String
  title      String
  content    Json              @default("{}")  // Tiptap JSON format
  order      Int
  visibility PublicationStatus @default(DRAFT)
  wordCount  Int               @default(0)
  createdAt  DateTime          @default(now())
  updatedAt  DateTime          @updatedAt

  book           Book            @relation(fields: [bookId], references: [id], onDelete: Cascade)
  plotNote       PlotNote?
  inlineComments InlineComment[]
  chapterReviews ChapterReview[]
  wordCountLogs  WordCountLog[]
  timelineEntries TimelineEntry[]

  @@unique([bookId, order])
}

// ─── WRITERS STUDIO — PLOTTING ─────────────────────────────────────────────

model PlotNote {
  id        String   @id @default(cuid())
  chapterId String   @unique
  notes     Json     @default("{}")  // Tiptap JSON format
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  chapter Chapter @relation(fields: [chapterId], references: [id], onDelete: Cascade)
  scenes  Scene[]
}

model Scene {
  id          String   @id @default(cuid())
  plotNoteId  String
  title       String
  description String?
  order       Int
  characterIds String[] // IDs de Character
  locationId  String?
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  plotNote PlotNote  @relation(fields: [plotNoteId], references: [id], onDelete: Cascade)
  location Location? @relation(fields: [locationId], references: [id])
}

// ─── WRITERS STUDIO — TIMELINE ─────────────────────────────────────────────

model TimelineEntry {
  id        String   @id @default(cuid())
  bookId    String
  title     String
  description String?
  moment    String   // free text: "Day 1", "Year 203 AD", etc.
  color     String   @default("#6b3fa0")
  order     Int
  chapterId String?  // optional link to a chapter

  book    Book     @relation(fields: [bookId], references: [id], onDelete: Cascade)
  chapter Chapter? @relation(fields: [chapterId], references: [id])
}

// ─── WRITERS STUDIO — CHARACTERS ───────────────────────────────────────────

enum StoryRole {
  PROTAGONIST
  ANTAGONIST
  SECONDARY
  TERTIARY
  OTHER
}

model Character {
  id           String    @id @default(cuid())
  bookId       String
  name         String
  nickname     String?
  age          Int?
  birthDate    String?
  mainImageUrl String?
  gallery      String[]  // URLs de Cloudinary
  // Descripción física
  height       String?
  weight       String?
  build        String?
  eyeColor     String?
  hairColor    String?
  hairStyle    String?
  facialFeatures String?
  tattoos      String?
  dressingStyle  String?
  physicalNotes  String?
  // Story
  storyRole    StoryRole @default(SECONDARY)
  storyRoleNote String?
  shortTermGoals String?
  longTermGoals  String?
  // Backstory
  backstory    Json      @default("{}")  // Tiptap JSON
  createdAt    DateTime  @default(now())
  updatedAt    DateTime  @updatedAt

  book  Book  @relation(fields: [bookId], references: [id], onDelete: Cascade)
  linksFrom CharacterLink[] @relation("CharacterA")
  linksTo   CharacterLink[] @relation("CharacterB")
  locationCharacters LocationCharacter[]
  boardElements      BoardElement[]      @relation("CharacterBoardElement")
}

enum RelationshipType {
  FRIEND
  ENEMY
  LOVER
  FAMILY
  MENTOR
  RIVAL
  UNKNOWN
  OTHER
}

model CharacterLink {
  id               String           @id @default(cuid())
  characterAId     String
  characterBId     String
  relationshipType RelationshipType
  note             String?
  createdAt        DateTime         @default(now())

  characterA Character @relation("CharacterA", fields: [characterAId], references: [id], onDelete: Cascade)
  characterB Character @relation("CharacterB", fields: [characterBId], references: [id], onDelete: Cascade)

  @@unique([characterAId, characterBId])
}

// ─── WRITERS STUDIO — WORLD BUILDING ───────────────────────────────────────

model Location {
  id               String   @id @default(cuid())
  bookId           String
  parentLocationId String?
  name             String
  description      Json     @default("{}")  // Tiptap JSON
  images           String[] // URLs de Cloudinary
  createdAt        DateTime @default(now())
  updatedAt        DateTime @updatedAt

  book             Book       @relation(fields: [bookId], references: [id], onDelete: Cascade)
  parent           Location?  @relation("SubLocations", fields: [parentLocationId], references: [id])
  subLocations     Location[] @relation("SubLocations")
  locationCharacters LocationCharacter[]
  scenes           Scene[]
  boardElements    BoardElement[] @relation("LocationBoardElement")
}

model LocationCharacter {
  id          String   @id @default(cuid())
  locationId  String
  characterId String
  note        String?

  location  Location  @relation(fields: [locationId], references: [id], onDelete: Cascade)
  character Character @relation(fields: [characterId], references: [id], onDelete: Cascade)

  @@unique([locationId, characterId])
}

// ─── WRITERS STUDIO — BOARD ─────────────────────────────────────────────────

enum BoardElementType {
  CHARACTER
  LOCATION
  NOTE
  IMAGE
}

model Board {
  id        String   @id @default(cuid())
  bookId    String
  name      String
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  book        Book           @relation(fields: [bookId], references: [id], onDelete: Cascade)
  elements    BoardElement[]
  connections BoardConnection[]
}

model BoardElement {
  id          String           @id @default(cuid())
  boardId     String
  type        BoardElementType
  referenceId String?          // ID de Character o Location (si aplica)
  posX        Float            @default(0)
  posY        Float            @default(0)
  content     Json             @default("{}")  // texto, imageUrl, color (para notas e imágenes)
  createdAt   DateTime         @default(now())

  board       Board       @relation(fields: [boardId], references: [id], onDelete: Cascade)
  character   Character?  @relation("CharacterBoardElement", fields: [referenceId], references: [id])
  location    Location?   @relation("LocationBoardElement", fields: [referenceId], references: [id])
  connectionsFrom BoardConnection[] @relation("FromElement")
  connectionsTo   BoardConnection[] @relation("ToElement")
}

model BoardConnection {
  id            String   @id @default(cuid())
  boardId       String
  fromElementId String
  toElementId   String
  label         String?
  color         String   @default("#6b3fa0")
  isAutomatic   Boolean  @default(false)  // true = auto-generated from CharacterLink

  board       Board        @relation(fields: [boardId], references: [id], onDelete: Cascade)
  fromElement BoardElement @relation("FromElement", fields: [fromElementId], references: [id], onDelete: Cascade)
  toElement   BoardElement @relation("ToElement", fields: [toElementId], references: [id], onDelete: Cascade)
}

// ─── WRITERS STUDIO — FREE NOTES ───────────────────────────────────────────

model BookNote {
  id        String   @id @default(cuid())
  bookId    String
  title     String
  content   Json     @default("{}")  // Tiptap JSON
  tags      String[]
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  book Book @relation(fields: [bookId], references: [id], onDelete: Cascade)
}

// ─── WRITING GOALS ──────────────────────────────────────────────────────────

enum GoalType {
  DAILY
  WEEKLY
  MONTHLY
  DEADLINE
}

model WritingGoal {
  id           String    @id @default(cuid())
  userId       String
  bookId       String?   // null = global writer goal
  type         GoalType
  targetWords  Int
  deadlineDate DateTime? // only for DEADLINE type
  active       Boolean   @default(true)
  createdAt    DateTime  @default(now())

  user User  @relation(fields: [userId], references: [id], onDelete: Cascade)
  book Book? @relation(fields: [bookId], references: [id])
}

model WordCountLog {
  id              String   @id @default(cuid())
  userId          String
  bookId          String
  chapterId       String
  date            DateTime @db.Date
  wordsDelta      Int      // can be negative (if text was deleted)
  totalWordsBook  Int      // cumulative total in the book at that point
  createdAt       DateTime @default(now())

  user    User    @relation(fields: [userId], references: [id])
  chapter Chapter @relation(fields: [chapterId], references: [id])

  @@index([userId, date])
}

// ─── BETA SYSTEM ────────────────────────────────────────────────────────────

enum BetaStatus {
  PENDING
  APPROVED
  REJECTED
}

model BetaReader {
  id                String     @id @default(cuid())
  bookId            String
  userId            String
  status            BetaStatus @default(PENDING)
  motivationMessage String     @db.VarChar(500)
  createdAt         DateTime   @default(now())
  updatedAt         DateTime   @updatedAt

  book           Book            @relation(fields: [bookId], references: [id], onDelete: Cascade)
  user           User            @relation(fields: [userId], references: [id])
  inlineComments InlineComment[]
  chapterReviews ChapterReview[]

  @@unique([bookId, userId])
}

model InlineComment {
  id           String   @id @default(cuid())
  chapterId    String
  betaReaderId String
  selectedText String
  fromPos      Int
  toPos        Int
  content      String   @db.Text
  resolved     Boolean  @default(false)
  createdAt    DateTime @default(now())
  updatedAt    DateTime @updatedAt

  chapter    Chapter      @relation(fields: [chapterId], references: [id], onDelete: Cascade)
  betaReader BetaReader   @relation(fields: [betaReaderId], references: [id])
  replies    CommentReply[]
}

model CommentReply {
  id        String   @id @default(cuid())
  commentId String
  authorId  String
  content   String   @db.Text
  createdAt DateTime @default(now())

  comment InlineComment @relation(fields: [commentId], references: [id], onDelete: Cascade)
  author  User          @relation(fields: [authorId], references: [id])
}

model ChapterReview {
  id           String   @id @default(cuid())
  chapterId    String
  betaReaderId String
  content      String   @db.VarChar(1000)
  createdAt    DateTime @default(now())

  chapter    Chapter    @relation(fields: [chapterId], references: [id], onDelete: Cascade)
  betaReader BetaReader @relation(fields: [betaReaderId], references: [id])

  @@unique([chapterId, betaReaderId])
}

// ─── LIBRARY & SHELVES ──────────────────────────────────────────────────────

model Library {
  id        String   @id @default(cuid())
  userId    String
  bookId    String
  rating    Float?   // 0-5, con medias estrellas
  addedAt   DateTime @default(now())

  user       User        @relation(fields: [userId], references: [id], onDelete: Cascade)
  book       Book        @relation(fields: [bookId], references: [id], onDelete: Cascade)
  shelfBooks ShelfBook[]

  @@unique([userId, bookId])
}

model Shelf {
  id        String   @id @default(cuid())
  userId    String
  name      String
  isPublic  Boolean  @default(false)
  isSystem  Boolean  @default(false)  // true = "Leyendo ahora", "Quiero leer", "Leídos"
  createdAt DateTime @default(now())

  user       User        @relation(fields: [userId], references: [id], onDelete: Cascade)
  shelfBooks ShelfBook[]
}

model ShelfBook {
  id        String   @id @default(cuid())
  shelfId   String
  libraryId String
  addedAt   DateTime @default(now())

  shelf   Shelf   @relation(fields: [shelfId], references: [id], onDelete: Cascade)
  library Library @relation(fields: [libraryId], references: [id], onDelete: Cascade)

  @@unique([shelfId, libraryId])
}

// ─── NOTIFICATIONS ──────────────────────────────────────────────────────────

enum NotificationType {
  BETA_REQUEST_RECEIVED    // escritor: nueva solicitud beta
  BETA_REQUEST_APPROVED    // lector: solicitud aprobada
  BETA_REQUEST_REJECTED    // lector: solicitud rechazada
  NEW_INLINE_COMMENT       // escritor: nuevo comentario inline
  NEW_CHAPTER_REVIEW       // escritor: nueva reseña de capítulo
  BOOK_SAVED               // escritor: alguien guardó su libro
  NEW_CHAPTER_PUBLISHED    // lector: nuevo capítulo en libro de biblioteca
  COMMENT_REPLY            // beta: el escritor respondió a su comentario
}

model Notification {
  id        String           @id @default(cuid())
  userId    String
  type      NotificationType
  payload   Json             // datos contextuales (bookId, chapterId, actorName, etc.)
  read      Boolean          @default(false)
  createdAt DateTime         @default(now())

  user User @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@index([userId, read])
}
```

// ─── PASSWORD RESET ───────────────────────────────────────────────────────────

model PasswordResetToken {
  id        String    @id @default(cuid())
  userId    String
  tokenHash String    @unique  // store hashed with SHA-256, never plain text
  expiresAt DateTime
  usedAt    DateTime?           // set when the token is consumed
  createdAt DateTime  @default(now())

  user User @relation(fields: [userId], references: [id], onDelete: Cascade)
}