# monpy-db [![Build Status](https://travis-ci.org/monpoco/monpy-db.svg?branch=master)](https://travis-ci.org/monpoco/monpy-db) [![npm version](https://badge.fury.io/js/monpy-db.svg)](http://badge.fury.io/js/monpy-db)

## Installation

```
$ npm install monpy-db
```

## Example

#### Model
```js
var db = require('..')('mysql');

function User(){
	db.BaseEntity.apply(this, arguments);
}

db.inherits(User, db.BaseEntity);
```

#### Use
```js
var db = require('monpy-db')('mysql'),
    co = require('co'),
    config = {
      pool: 5,
      host: 'localhost',
      user: 'test',
      password: 'password',
      database: 'test_db'
    };


var model = new User();

var user = {
  name: 'monpy',
  comment: 'hello',
  created_at: new Date()
};

co(function *(){
  // DataBase Connect
  db.connect(config);

  // INSERT
  var ret = yield model.insert(user);
  // var ret = yield model.save(user);

  var userId = ret.insertId;
  
  var user = yield model.getById(userId);
  
  console.log(user);

  // UPDATE
  user.updated_at = new Date();
  var ret = yield model.update(user);
  // var ret = yield model.save(user);
  
  // DataBase Disconnect
  db.end();
});



```