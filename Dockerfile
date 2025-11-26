# Base image
FROM node:20-alpine

# Working directory
WORKDIR /app

# Install dependencies first (caching)
COPY package*.json ./
RUN npm install --production

# Copy source code
COPY . .

# Expose port (internal)
EXPOSE 3000

# Start command
CMD ["npm", "start"]