FROM node:6.9.1

MAINTAINER Maxim Tishchenko <qwertmax@gmail.com>

ADD ./ /usr/src/app
WORKDIR /usr/src/app

RUN npm install && npm install -g bower --allow-root && bower --allow-root install && npm install -g gulp && gulp build && npm install -g http-server

EXPOSE 8080

CMD ["http-server", "dist"]
