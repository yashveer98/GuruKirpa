FROM node:20-alpine

WORKDIR /app

# 1. Copy ONLY package files first
COPY package*.json ./

# 2. Install dependencies (This layer gets CACHED unless package.json changes)
RUN npm install

# 3. Copy the rest of your application source code
COPY . .

# 4. Command to run the application
CMD ["npm", "run", "dev"]