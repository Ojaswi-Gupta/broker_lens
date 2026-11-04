FROM node:18-alpine

WORKDIR /app

# Install dependencies
COPY package*.json ./
RUN npm install

# Copy application source
COPY . .

# Build Next.js application
ENV NEXT_TELEMETRY_DISABLED 1
RUN npm run build

# Expose Next.js port
EXPOSE 3000

# Start production server
CMD ["npm", "run", "start"]
