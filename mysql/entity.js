/**
 * Entity for mysql
 *
 * Copyright (c) 2015 monpoco
 * MIT Licensed
 */


var debug = require('debug')('monpy:entity'),
	util = require('monpy-util'),
	dbutil = require('../lib/dbutil'),
	colors = require('colors'),
	db = require('mysql'),
	Field = require('../lib/field'),
	co = require('co'),
	timeout = 30000;


var connection, database, is_pool,
	regType = /^[a-z]+\(([0-9]+)\)/;


function setTimeout(time) {
	timeout = time;
}

exports.setTimeout = setTimeout;

function getTimeout() {
	return time;
}
exports.getTimeout = getTimeout;


/**
 * Connection.
 *
 * @return {Promise}
 * @api public
 */
function connect(options){

	return new Promise(function(resolve, reject) {
		debug('connection start');
		if(!options)
			throw new Error('options is requaired');

		var fn;
		pool = options.pool || 5;
		pool = isNaN(pool) ? 5 : pool;

		if(pool > 0){
			connection = db.createPool(options);
			fn = connection.getConnection;

		} else {
			connection = db.createConnection(options);
			fn = connection.connect;
		}
		if(options.database)
			database = options.database;

		fn.call(connection, function(err, connection){

			if(err)
				return reject(err);

			debug('Database connection complate!');

			resolve();
		});
	});

};
exports.connect = connect;

/**
 * Disconnect
 *
 * @return {Promise}
 * @api public
 */
function end() {
	return new Promise(function(resolve, reject) {
		if(!__MonpocoEntityChach.connection)
			return resolve();

		connection.end(function(err){
			if(err)
				return reject(err);

			resolve();
		});

	});
};
exports.end = end;

/**
 * ping
 *
 * @return {Promise}
 * @api public
 */
function ping(){
	return new Promise(function(resolve, reject) {
		connection.ping(function (err) {
			if (err) return reject(err);
			resolve();
		});
	});
}
exports.ping = ping;


/**
 * inherits entity model class.
 *
 * @return {Promise}
 * @api public
 */
function inherits(clazz, superClazz) {



	if(typeof clazz !== 'function')
		throw new Error('class name is undefined');

	if(!clazz.name)
		throw new Error('class name is undefined');

	var name = clazz.name,
		table_name = util.toSnakeCase(name);

	util.inherits(clazz, superClazz);

	clazz.table_name = clazz.prototype.table_name = table_name;
	getScheme(table_name).then(function(field){
		clazz.field = clazz.prototype.field = field;
	});



}

exports.inherits = inherits;

/**
 * inherits entity model class.
 *
 * @return {Promise}
 * @api public
 */
function query(sql, placeholder){
	var self = this;

	return new Promise(function(resolve, reject) {
		if(!sql)
			return reject(new Error('sql is requaired'));


		var queryOptions = {
			sql: sql,
			timeout: timeout
		};
		if(placeholder) {
			queryOptions.values = placeholder;
		}

		var args = [];
		args.push(queryOptions);
		debug('[sql]'.gray, sql);
		debug('[placeholders]'.gray, placeholder);

		var cb = function(err, data, fld){

			if(err)
				return reject(err);

			resolve(data, fld);
		};
		args.push(cb);
		connection.query.apply(connection, args);
	});
};
exports.query = query;

/**
 * get table scheme.
 *
 * @api private
 */
function getScheme(table_name){

	return new Promise(function(resolve, reject) {

		var sql = util.format('SELECT * FROM `information_schema`.`columns` c WHERE c.`table_schema` = \'%s\' AND c.`table_name` = \'%s\' order by ordinal_position', database, table_name);
		query(sql).then(function(rows){
			
			var scheme = {};

			//console.log(rows);
			rows.forEach(function(row){
				var name, type, nativeType, len, scal, unsigned, primary, uniq, is_null, defaultVal, m;

				name = row.COLUMN_NAME;
				nativeType = row.DATA_TYPE;
				type = dbutil.convertType(nativeType);

				if(type === Number) {
					len = row.NUMERIC_PRECISION;
					scal = row.NUMERIC_SCALE;
				} else if(type === String || type === Buffer) {
					len = row.CHARACTER_MAXIMUM_LENGTH;
				}

				defaultVal = row.COLUMN_DEFAULT;
				is_null = row.IS_NULLABLE !== 'NO';


				if(row.COLUMN_KEY === 'PRI') {
					primary = true;
				}
				if(row.COLUMN_KEY === 'UNI') {
					uniq = true;
				}

				var fld = Object.create(Field);
				fld.name = name;
				fld.type = type;
				fld.nativeType = nativeType;
				fld.length = len;
				fld.scal = scal;
				fld.unsigned = unsigned;
				fld.primary = primary;
				fld.uniq = uniq;
				fld.is_null = is_null;
				fld.defaultVal = defaultVal;
				scheme[name] = fld;
			});

			resolve(scheme);

		}).catch(reject);

	});
};




function BaseEntity(conn){
	this.clear();
	this.validation = false;
	this.fields = null;
	this.primary = 'id';
};

/**
 * __init__
 *
 * @api private
 */
BaseEntity.prototype.__init__ = function(){

};

/**
 * clear
 * Delete query chach
 *
 * @api public
 */
BaseEntity.prototype.clear = function(){
	this.__as = null;
	this.__placeholder = [];
	this.__chach = {
		columns:'*',
		where:[],
		order:[],
		group:[],
		having:[],
		join:[],
		limit:null	
	};
	return this;
};

/**
 * parWhere
 *
 * @api public
 */
BaseEntity.prototype.parWhere = function(params, conj){
	var self = this;
	conj = (conj || 'AND').toUpperCase();
	if(!(conj == 'AND' || conj == 'OR') ){
		throw new Error('where conjunction is invalid value\n"only : AND","OR"');
	}
	if(!util.isArray(params))
		return this;

	var a = [], str = '';

	params.forEach(function(p){
		if(!util.isArray(p)) {
			return;
		}
		var col, operator, val, parConj = 'AND';
		col = p[0];
		operator = p[1];
		val = p[2];
		if(p.length > 3)
			parConj = p[4];
		
		a.push(self.__make_where(col, operator, val, parConj));
	});

	str = a.join(' ');
	var idx = 3;
	if(str.indexOf('OR') == 0)
		idx = 2;

	str = str.slice(idx);

	str = conj + ' (' + str + ')';
	this.__chach.where.push(str);
	return this;
};

/**
 * where
 *
 * @api public
 */
BaseEntity.prototype.where = function(col, operator, val, conj){
	this.__chach.where.push( this.__make_where(col, operator, val, conj) );
	return this;
};

/**
 * __make_where
 *
 * @api private
 */
BaseEntity.prototype.__make_where = function(col, operator, val, conj){
	var str = '';

	conj = (conj || 'AND').toUpperCase();
	if(!(conj == 'AND' || conj == 'OR') ){
		throw new Error('where conjunction is invalid value\n"only : AND","OR"');
	}
	str += conj + ' ';

	operator = operator.toUpperCase();
	if(['=', '!=', '<>', '<', '>', '<=', '>=', '<=>', 'LIKE'].indexOf(operator) > -1){
		str += ['`'+col+'`', operator, '?'].join(' ');
		this.__placeholder.push(val);

	} else if(operator.indexOf('IN') > -1) {

		var t = [];

		if(util.isArray(val)) {

			for(var i =0; i < val.length; i++){

				this.__placeholder.push(val[i]);
				t.push('?');

			}
		} else {

			this.__placeholder.push(val);
			t.push('?');
		}
		str += ['`'+col+'`', operator, '('+t.join(', ')+')'].join(' ');

	} else {

		throw new Error('Sorry. operator "%s" is not support. orz\nPlease use "whereQuery" method.', operator);

	}

	return str;

};

/**
 * order
 *
 * @api public
 */
BaseEntity.prototype.order = function(col, type){
	type = type || 'ASC';

	if(!(type == 'ASC' || type == 'DESC')) {
		throw new Error('Parameter "Sort type" is invalid value');
	}

	this.__chach.order.push(col + ' ' + type);
	return this;
};

/**
 * limit
 *
 * @api public
 */
BaseEntity.prototype.limit = function(line, offset){
	var str = String(line);
	if(offset || offset === 0){
		str += ', ' + offset;
	}

	this.__chach.limit = str;

	return this;
};

/**
 * toSQL
 *
 * @api public
 */
BaseEntity.prototype.toSQL = function(m) {
	m = m || 'SELECT';

	var sql = 'SELECT ', columns = '*', str;

	if(this.__chach.columns){
		if(util.isArray(this.__chach.columns)) {
			columns = this.__chach.columns.join(',');
		} else {
			columns = this.__chach.columns;
		}
	}

	sql += columns + ' FROM `' + database + '`.`' + this.table_name + '`';
	if(this.__chach.where && this.__chach.where.length > 0) {
		str = this.__chach.where.join(' ');
		var idx = 0;
		if(str.indexOf('AND') === 0) idx = 4;
		else if(str.indexOf('OR') === 0) idx = 3;
		str = str.slice(idx);
		sql += ' WHERE ' + str;
	}

	if(this.__chach.order && this.__chach.order.length > 0) {
		sql += ' ORDER BY ' + this.__chach.order.join(', ');
	}

	if(this.__chach.limit) {
		sql += ' LIMIT ' + this.__chach.limit;
	}
	return sql;
};

/**
 * get
 *
 * @api public
 */
BaseEntity.prototype.get = function(){
	var sql = this.toSQL(),
		p = query(sql, this.__placeholder);

	this.clear();
	return p;

};

BaseEntity.prototype.group = function(){

};


/**
 * getBy
 *
 * @api public
 */
BaseEntity.prototype.getBy = function(name, val){
	return this.where(name, '=', val).get();
}

/**
 * first
 *
 * @api public
 */
BaseEntity.prototype.first = function(name, val){
	var self = this;
	return new Promise(function(resolve, reject) {
		self.get().then(function(rows){
			if(rows && rows.length > 0){
				return resolve(rows[0]);
			}
			resolve(null);
		}).catch(reject);
	});
};

/**
 * count
 *
 * @api public
 */
BaseEntity.prototype.count = function(){
	
	var self = this;
	return new Promise(function(resolve, reject) {
		self.__chach.columns = ['COUNT(1) AS ROW_CNT'];
		self.get().then(function(rows){
			var cnt = 0;
			if(rows && rows.length > 0) {
				cnt = rows[0]['ROW_CNT'];
			}
			resolve(cnt);
		}).catch(reject);
	});
};

/**
 * paginate
 *
 * @api public
 */
BaseEntity.prototype.paginate = function(page, size){
	var self = this;

	return new Promise(function(resolve, reject) {
		page = parseInt(page);

		var line = page * size,
			limit = line + ', ' + size,
			pager = {
				row:0,
				totalPage:0,
				pageSize:size,
				currentPage:page,
				prevPage:0,
				nextPage:0
			};

		var sql = 'SELECT COUNT(1) AS r FROM `' + database + '`.`' + self.table_name + '`';
		if(self.__chach.where && self.__chach.where.length > 0) {
			str = self.__chach.where.join(' ');
			var idx = 0;
			if(str.indexOf('AND') === 0) idx = 4;
			else if(str.indexOf('OR') === 0) idx = 3;
			str = str.slice(idx);
			sql += ' WHERE ' + str;
		}
		query(sql, self.__placeholder).then(function(rows){
			var row = parseInt(rows[0]['r']);
			pager.row = row;
			pager.totalPage = Math.ceil(row / size);
			pager.prevPage = Math.max(0, page-1);
			pager.nextPage = Math.min(pager.totalPage-1, page+1);


			self.limit(line, size).get().then(function(data){

				resolve({
					rows: data,
					pager: pager
				});

			}).catch(reject);

		}).catch(reject);

	});
};

/**
 * getById
 *
 * @api public
 */
BaseEntity.prototype.getById = function(val){
	var self = this;
	return self.where('id', '=', val).first();
}

/**
 * insert
 *
 * @api public
 */
BaseEntity.prototype.insert = function(data){

	var sql = 'INSERT INTO `' + database + '`.`' + this.table_name + '`' + ' SET ?';
	p = query(sql, data);
	this.clear();
	return p;
}

/**
 * update
 *
 * @api public
 */
BaseEntity.prototype.update = function(data){

	var sql = 'UPDATE `' + database + '`.`' + this.table_name + '`' + ' SET ';
	var v, 
		ph = [],
		a = [];

	for(var col in data) {
		v = data[col];

		a.push(col + ' = ?');
		ph.push(v);
	}
	sql += a.join(',');

	if(this.__chach.where && this.__chach.where.length > 0) {
		str = this.__chach.where.join(' ');
		var idx = 0;
		if(str.indexOf('AND') === 0) idx = 4;
		else if(str.indexOf('OR') === 0) idx = 3;
		str = str.slice(idx);
		sql += ' WHERE ' + str;
	}

	ph = ph.concat(this.__placeholder);

	var p = query(sql, ph);
	this.clear();
	return p;
};

/**
 * updateBy
 *
 * @api public
 */
BaseEntity.prototype.updateBy = function(col, val, data) {

	return this.where(col, '=', val).update(data);
}

/**
 * updateById
 *
 * @api public
 */
BaseEntity.prototype.updateById = function(val, data) {

	return this.where('id', '=', val).update(data);
}

/**
 * delete
 *
 * @api public
 */
BaseEntity.prototype.delete = function(){

	var sql = 'DELETE FROM `' + database + '`.`' + this.table_name + '`';
	var str;
	if(this.__chach.where && this.__chach.where.length > 0) {
		str = this.__chach.where.join(' ');
		var idx = 0;
		if(str.indexOf('AND') === 0) idx = 4;
		else if(str.indexOf('OR') === 0) idx = 3;
		str = str.slice(idx);
		sql += ' WHERE ' + str;
	}
	console.log(sql);
	var p = query(sql, this.__placeholder);
	this.clear();
	return p;
};

/**
 * deleteBy
 *
 * @api public
 */
BaseEntity.prototype.deleteBy = function(col, val){
	return this.where(col, '=', val).delete();
};

/**
 * deleteById
 *
 * @api public
 */
BaseEntity.prototype.deleteById = function(val){
	return this.where('id', '=', val).delete();
};

/**
 * truncate
 *
 * @api public
 */
BaseEntity.prototype.truncate = function (){
	var sql = 'TRUNCATE `' + database + '`.`' + this.table_name + '`';
	var p = query(sql, this.__placeholder);
	this.clear();
	return p;	
};

/**
 * save
 *
 * @api public
 */
BaseEntity.prototype.save = function(data){
	var pk = this.primary || 'id';

	var pkValue = data[pk];

	if(pkValue) {
		delete data[pk];
		return this.updateBy(pk, pkValue, data);
	} else {
		return this.insert(data);
	}

}


exports.BaseEntity = BaseEntity;
