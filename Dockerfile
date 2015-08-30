FROM node:0.12-onbuild
RUN npm install -g gulp
RUN gulp
EXPOSE 3000
ONBUILD ENV NODE_ENV production
ONBUILD COPY production.yml ./config/
ONBUILD RUN gulp app
