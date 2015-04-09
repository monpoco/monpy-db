# monpy-db [![Build Status](https://travis-ci.org/monpoco/monpy-db.svg?branch=master)](https://travis-ci.org/monpoco/monpy-db) [![NPM version](https://badge.fury.io/js/monpoco-db.svg)](http://badge.fury.io/for/js/monpy-db)

## Installation

```
$ npm install monpy-db
```

## Example

```js
var co = require('co'),
	db = require('monpy-db')('mysql');



```


## Change root

```js
var router = require('monpy-router');


router.root({
    controller: 'hoge', action: 'fuga'
});

router.resolve('/');
    => { controller: 'hoge', action: 'fuga' }

router.resolve('/app');
    => { controller: 'app', action: 'fuga' }

```