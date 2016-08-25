FROM node:4.2.3-onbuild
RUN npm install -g gulp
ENV NODE_ENV production
RUN gulp
EXPOSE 3000
