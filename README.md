# 🧠 Zenya PSY Bot

👉 [Try Zenya on Telegram](https://t.me/zenya_psy_bot)

> **Intelligent Telegram Bot for Psychology Support and Mental Health Assistance**

Zenya PSY Bot is a comprehensive psychology platform built as a Telegram bot, offering AI-powered mental health support, personalized content delivery, and administrative tools for psychology professionals.

## 📖 About

Zenya PSY Bot combines modern web technologies with artificial intelligence to provide accessible mental health support through Telegram. The bot features interactive conversations, personalized content recommendations, subscription management, and comprehensive administrative tools for mental health professionals.

## ✨ Features

### 🤖 Core Functionality
- **AI-Powered Conversations**: Intelligent chat interactions using OpenAI integration
- **User Management**: Comprehensive user profiles and session tracking
- **Subscription System**: Payment processing and subscription management
- **Content Delivery**: Personalized psychology content and exercises

### 📚 Content Management
- **Meta Cards**: Interactive psychology cards and exercises
- **Categories & Chapters**: Structured content organization
- **Media Support**: Image, audio, and video content handling
- **Practice Exercises**: Guided psychology practices and techniques

### 🔧 Administrative Tools
- **Admin Dashboard**: Comprehensive administration interface
- **Broadcasting**: Mass messaging and announcements
- **Content Management**: Add and manage psychology content
- **User Analytics**: Monitor user engagement and progress
- **Media Validation**: Content verification and approval system

### 🛠️ Technical Features
- **Rate Limiting**: Intelligent request throttling
- **Queue Management**: Background job processing with BullMQ
- **Monitoring**: Error tracking and performance monitoring with Sentry
- **Database**: PostgreSQL with Prisma ORM
- **Caching**: Redis integration for performance optimization
- **Docker Support**: Containerized deployment

## 🏗️ Architecture

The bot is built using modern TypeScript technologies:

- **Framework**: NestJS with modular architecture
- **Telegram**: Telegraf integration via nestjs-telegraf
- **Database**: PostgreSQL with Prisma ORM
- **Cache**: Redis for session management and caching
- **AI**: OpenAI integration for intelligent conversations
- **Queue**: BullMQ for background job processing
- **Monitoring**: Sentry for error tracking and performance monitoring

## 🚀 Getting Started

### Prerequisites

- Node.js (v18 or higher)
- pnpm package manager
- PostgreSQL database
- Redis server
- Telegram Bot Token (from @BotFather)
- OpenAI API key

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd zenya-bot
   ```

2. **Install dependencies**
   ```bash
   pnpm install
   ```

3. **Set up environment variables**
   ```bash
   cp .env.example .env
   ```
   Configure the following variables in `.env`:
   ```env
   # Telegram
   TELEGRAM_BOT_TOKEN=your_bot_token_here
   
   # Database
   DATABASE_URL=postgresql://username:password@localhost:5432/zenya_bot
   
   # Redis
   REDIS_URL=redis://localhost:6379
   
   # OpenAI
   OPENAI_API_KEY=your_openai_api_key_here
   
   # Sentry (optional)
   SENTRY_DSN=your_sentry_dsn_here
   ```

4. **Set up the database**
   ```bash
   # Generate Prisma client
   pnpm prisma:generate
   
   # Run database migrations
   pnpm prisma:migrate:deploy
   ```

5. **Start the application**
   ```bash
   # Development mode with hot reload
   pnpm start:dev
   
   # Production mode
   pnpm start:prod
   ```

## 🐳 Docker Deployment

### Using Docker Compose

1. **Start all services**
   ```bash
   pnpm docker:up
   ```

2. **Stop services**
   ```bash
   pnpm docker:down
   ```

The Docker setup includes:
- Main application container
- PostgreSQL database
- Redis cache
- Automated database migrations

## 🧪 Development

### Available Scripts

```bash
# Development
pnpm start:dev          # Start with hot reload
pnpm start:debug        # Start with debugging

# Building
pnpm build              # Build the application
pnpm start:prod         # Run production build

# Testing
pnpm test               # Run unit tests
pnpm test:watch         # Run tests in watch mode
pnpm test:cov           # Run tests with coverage
pnpm test:e2e           # Run end-to-end tests

# Database
pnpm prisma:studio      # Open Prisma Studio
pnpm prisma:migrate:dev # Create and apply new migration
pnpm prisma:generate    # Generate Prisma client

# Code Quality
pnpm lint               # Lint the codebase
pnpm lint:fix           # Fix linting issues
pnpm format             # Format code with Prettier

# Git Workflow
pnpm cm                 # Interactive commit with Commitizen
pnpm branch             # Create new branch with naming convention
```

### Database Operations

The project includes comprehensive database management scripts:

```bash
# Create a full database backup
./scripts/backup-db.sh

# Restore database from backup
./scripts/restore-db.sh <backup_filename>

# Database migrations
pnpm prisma:migrate:dev     # Development migrations
pnpm prisma:migrate:deploy  # Production migrations
pnpm prisma:migrate:status  # Check migration status
pnpm prisma:migrate:reset   # Reset database (development only)
```

For detailed database operations, see the [Database Scripts Documentation](./scripts/README.md).


## 🤝 Contributing

1. **Fork the repository**
2. **Create a feature branch**
   ```bash
   pnpm branch
   # Follow the interactive branch naming
   ```
3. **Make your changes**
4. **Commit using Commitizen**
   ```bash
   pnpm cm
   ```
5. **Push and create a Pull Request**

### Code Standards

- **TypeScript**: Strict type checking enabled
- **ESLint**: Code linting with custom rules
- **Prettier**: Code formatting
- **Husky**: Pre-commit hooks for code quality
- **Commitizen**: Structured commit messages

## 📄 License

This project is licensed under the UNLICENSED license - see the package.json file for details.

## 🆘 Support

For support, please:

1. Check existing GitHub issues
2. Create a new issue with detailed description
3. Include relevant logs and error messages

---

**Made with ❤️ by Roman Trukhtanov**
