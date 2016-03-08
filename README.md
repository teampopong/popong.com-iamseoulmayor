# Seoul 프로젝트 개발 환경 구성

## Requirements

Node.js v0.4.12 (use [nvm](https://github.com/creationix/nvm))

    curl -o- https://raw.githubusercontent.com/creationix/nvm/v0.31.0/install.sh | bash  # install nvm
    nvm install 0.4.12
    nvm use --delete-prefix v0.4.12

## Configuration

### Linux:
    # See https://nodejs.org/en/download/package-manager/#debian-and-ubuntu-based-linux-distributions
    $ apt-get install nodejs npm
    $ npm install

### Mac OS X:
    brew install nodejs
    curl https://npmjs.org/install.sh | sh
    npm link

## License
[Apache 2.0](www.apache.org/licenses/LICENSE-2.0.html)
