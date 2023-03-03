FROM node:19.7.0

RUN apt-get install libreadline-dev

RUN wget https://www.sqlite.org/2023/sqlite-autoconf-3410000.tar.gz && \
    tar -xvf sqlite-autoconf-3410000.tar.gz && \
    rm sqlite-autoconf-3410000.tar.gz && \
    cd sqlite-autoconf-3410000 && \
    ./configure && make && make install
RUN echo 'export PATH="/usr/local/bin:$PATH"' >> /root/.bashrc

WORKDIR /node
COPY ./package.json ./package.json
RUN npm i

COPY ./src ./src/
COPY ./templates ./templates/
COPY ./test ./test/
COPY ./db ./db/

CMD ["npm", "test"]
