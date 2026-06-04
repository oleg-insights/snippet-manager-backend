FROM node:20-alpine

WORKDIR /app

COPY package*.json ./
COPY prisma ./prisma/ 

RUN npm install

COPY . .

RUN npx prisma generate

RUN npm run build

CMD ["sh", "-c", "npx prisma migrate deploy && node dist/src/main"]