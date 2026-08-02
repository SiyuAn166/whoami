FROM emscripten/emsdk:3.1.61

WORKDIR /src
COPY . /src

RUN chmod +x /src/compile.sh
CMD ["/bin/bash", "/src/compile.sh"]
