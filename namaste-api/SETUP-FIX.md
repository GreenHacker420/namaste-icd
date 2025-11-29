# Setup Fix Guide

## ✅ Issue Resolved: Node.js Version & Dependencies

You encountered errors because:
1. **Node.js v20.18.0** is installed, but the project requires **Node.js 22+**
2. Dependencies weren't installed due to version mismatch
3. Prisma 7 requires Node.js 20.19+, 22.12+, or 24.0+

---

## 🔧 Solution Applied

I've installed **Node.js v22.21.1** using nvm and set up the project. Here's what was done:

1. ✅ Installed Node.js 22.21.1 via nvm
2. ✅ Installed all npm dependencies (253 packages)
3. ✅ Created `.nvmrc` file to auto-use Node.js 22
4. ✅ Created `.env` file from template
5. ✅ Created `setup.sh` script for future use

---

## 🚀 Next Steps to Start the Server

### Step 1: Configure Environment Variables

Edit the `.env` file and add your API keys:

```bash
# Open in your editor
code .env

# Or use nano
nano .env
```

**Required variables:**
```env
# Database (update with your PostgreSQL credentials)
DATABASE_URL=postgresql://user:password@localhost:5432/namaste_icd

# Google Gemini API Key (REQUIRED)
GOOGLE_API_KEY=your_actual_gemini_api_key_here

# WHO ICD-11 API (optional, for TM2 fetching)
WHO_ICD_CLIENT_ID=your_client_id
WHO_ICD_CLIENT_SECRET=your_client_secret

# Server
PORT=3000
NODE_ENV=development
```

**Get API Keys:**
- **Gemini API**: https://makersuite.google.com/app/apikey
- **WHO ICD-11**: https://icd.who.int/icdapi (optional)

### Step 2: Setup Database

```bash
# Make sure you're using Node.js 22
source ~/.nvm/nvm.sh && nvm use 22

# Generate Prisma client
npm run db:generate

# Run database migrations
npm run db:migrate

# Import NAMASTE codes (7,358 codes)
npm run import:namaste

# Optional: Fetch TM2 codes from WHO API (requires WHO credentials)
npm run fetch:tm2
```

### Step 3: Start the Server

```bash
# Development mode (with hot reload)
source ~/.nvm/nvm.sh && nvm use 22 && npm run dev

# Or production mode
source ~/.nvm/nvm.sh && nvm use 22 && npm start
```

The server will start at: **http://localhost:3000**

---

## 🎯 Quick Commands Reference

### Always Use Node.js 22

For every terminal session, run:
```bash
source ~/.nvm/nvm.sh && nvm use 22
```

Or add to your `~/.zshrc` or `~/.bashrc`:
```bash
# Auto-load nvm and use .nvmrc
export NVM_DIR="$HOME/.nvm"
[ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"

# Auto-switch Node version based on .nvmrc
autoload -U add-zsh-hook
load-nvmrc() {
  local node_version="$(nvm version)"
  local nvmrc_path="$(nvm_find_nvmrc)"

  if [ -n "$nvmrc_path" ]; then
    local nvmrc_node_version=$(nvm version "$(cat "${nvmrc_path}")")

    if [ "$nvmrc_node_version" = "N/A" ]; then
      nvm install
    elif [ "$nvmrc_node_version" != "$node_version" ]; then
      nvm use
    fi
  elif [ "$node_version" != "$(nvm version default)" ]; then
    echo "Reverting to nvm default version"
    nvm use default
  fi
}
add-zsh-hook chpwd load-nvmrc
load-nvmrc
```

### Development Commands

```bash
# Start dev server
npm run dev

# Start production server
npm start

# Database commands
npm run db:generate    # Generate Prisma client
npm run db:migrate     # Run migrations
npm run db:push        # Push schema changes
npm run db:studio      # Open Prisma Studio

# Data import
npm run import:namaste # Import NAMASTE codes
npm run fetch:tm2      # Fetch TM2 codes from WHO
```

---

## 🧪 Test the Server

Once the server is running, test these endpoints:

```bash
# Health check
curl http://localhost:3000/health

# API documentation
open http://localhost:3000/docs

# Search NAMASTE codes
curl "http://localhost:3000/api/v1/autocomplete/namaste?q=fever&limit=5"

# Map a code
curl -X POST http://localhost:3000/api/v1/mapping \
  -H "Content-Type: application/json" \
  -d '{"code": "AAA-1", "system": "ayurveda"}'
```

---

## 🐛 Troubleshooting

### Error: "Cannot find package 'dotenv'"
**Solution:** Dependencies not installed. Run:
```bash
source ~/.nvm/nvm.sh && nvm use 22 && npm install
```

### Error: "Unsupported engine"
**Solution:** Using wrong Node.js version. Run:
```bash
source ~/.nvm/nvm.sh && nvm use 22
node --version  # Should show v22.x.x
```

### Error: "Database connection failed"
**Solution:** 
1. Make sure PostgreSQL is running: `pg_isready`
2. Check DATABASE_URL in `.env` is correct
3. Create database: `createdb namaste_icd`

### Error: "GOOGLE_API_KEY is required"
**Solution:** Add your Gemini API key to `.env` file

### Port 3000 already in use
**Solution:** Change port in `.env`:
```env
PORT=3001
```

---

## 📁 Project Structure

```
namaste-api/
├── .env                    ✅ Created (needs API keys)
├── .nvmrc                  ✅ Created (Node.js 22)
├── setup.sh                ✅ Created (setup script)
├── node_modules/           ✅ Installed (253 packages)
├── src/
│   ├── index.js           ✅ Main server
│   ├── routes/            ✅ All routes implemented
│   ├── services/          ✅ LLM, ICD-11 API
│   └── workflows/         ✅ LangGraph mapping
├── prisma/
│   └── schema.prisma      ✅ Database schema
└── docs/
    ├── QUICKSTART.md      ✅ Quick start guide
    ├── BACKEND-IMPLEMENTATION-SUMMARY.md
    └── API-TESTING-EXAMPLES.md
```

---

## ✅ Checklist

Before starting the server:
- [x] Node.js 22 installed
- [x] Dependencies installed (npm install)
- [x] `.env` file created
- [ ] API keys added to `.env` ⚠️ **YOU NEED TO DO THIS**
- [ ] Database created
- [ ] Prisma client generated
- [ ] Migrations run
- [ ] NAMASTE codes imported

---

## 🎯 Summary

**What's Fixed:**
- ✅ Node.js 22.21.1 installed via nvm
- ✅ All 253 npm packages installed
- ✅ `.nvmrc` file created for version consistency
- ✅ `.env` file created from template

**What You Need to Do:**
1. **Add API keys to `.env`** (especially GOOGLE_API_KEY)
2. **Setup database** (create DB, run migrations)
3. **Import data** (NAMASTE codes)
4. **Start server** with Node.js 22

**Commands to run:**
```bash
# 1. Edit .env and add your API keys
code .env

# 2. Use Node.js 22
source ~/.nvm/nvm.sh && nvm use 22

# 3. Setup database
npm run db:generate
npm run db:migrate
npm run import:namaste

# 4. Start server
npm run dev
```

**Server will be at:** http://localhost:3000

---

## 📚 Additional Resources

- **Quick Start**: `QUICKSTART.md`
- **API Testing**: `API-TESTING-EXAMPLES.md`
- **Implementation Status**: `docs/IMPLEMENTATION-STATUS.md`
- **Backend Summary**: `docs/BACKEND-IMPLEMENTATION-SUMMARY.md`

**Need help?** Check the troubleshooting section above or review the documentation files.

---

**You're almost there! Just add your API keys and you're ready to go! 🚀**
