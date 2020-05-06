FROM ubuntu
RUN apt-get update && apt-get install -y python3 python3-pip curl vim wget nginx
RUN curl -o ~/.vimrc https://raw.githubusercontent.com/kaushikc92/scripts/master/.vimrc
RUN wget https://nodejs.org/dist/v12.13.1/node-v12.13.1-linux-x64.tar.xz
RUN mkdir -p /usr/local/lib/nodejs
RUN tar -xJf node-v12.13.1-linux-x64.tar.xz -C /usr/local/lib/nodejs
ENV PATH="/usr/local/lib/nodejs/node-v12.13.1-linux-x64/bin:${PATH}"
COPY nginx.conf /etc/nginx/

WORKDIR /
COPY requirements.txt .
RUN pip3 install --trusted-host pypi.python.org -r requirements.txt

WORKDIR /api
COPY api .

WORKDIR /ui
COPY ui .
RUN npm install

COPY entrypoint.sh /usr/local/bin
COPY proxy.conf /etc/nginx/conf.d
COPY options.json /

WORKDIR /api

#CMD ["sh", "-c", "tail -f /dev/null"]
ENTRYPOINT ["entrypoint.sh"]
