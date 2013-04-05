# Seoul 프로젝트 개발 환경 구성

## Linux:
- APT로 [nodejs](http://nodejs.org/)와 [npm](http://npmjs.org/)을 설치한다.

        apt-get install nodejs npm

- npm으로 [express](http://expressjs.com/), [jade](http://jade-lang.com/),
[underscore](http://documentcloud.github.com/underscore/),
[underscore.string](http://epeli.github.com/underscore.string/),
[connect](http://senchalabs.github.com/connect/) 를 설치한다.

        npm install express jade underscore underscore.string connect express-namespace

## Mac OS X:
- Install [Homebrew](http://mxcl.github.com/homebrew/)
- Install node.js and node.js packages with npm.js

        brew install nodejs
        curl https://npmjs.org/install.sh | sh
        npm link
