# Stage 1: Build the React application
FROM node:20-alpine AS builder
WORKDIR /app

# Copy dependency definitions and install
COPY package*.json ./
RUN npm ci

# Copy all source files and compile the production build
COPY . .
RUN npm run build

# Stage 2: Serve with lightweight Nginx
FROM nginx:alpine
# Copy compiled static assets from builder stage
COPY --from=builder /app/dist /usr/share/nginx/html

# Copy custom Nginx config for SPA routing (React Router/Navigation)
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Expose port 80
EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]