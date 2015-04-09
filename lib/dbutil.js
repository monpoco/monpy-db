var util = require('util');

function convertType(netiveType, adapter){

	adapter = adapter || 'mysql';

	if(!netiveType)
		throw new Error('netiveType is requaired');

	netiveType = netiveType.toUpperCase();

	var t;
	if(adapter === 'mysql') {

		switch(netiveType) {
			case 'TINYINT':
			case 'SMALLINT':
			case 'INT':
			case 'MEDIUMINT':
			case 'YEAR':
			case 'FLOAT':
			case 'DOUBLE': 
			t = Number; break;

			case 'TIMESTAMP':
			case 'DATE':
			case 'DATETIME':
			t = Date; break

			case 'TINYBLOB':
			case 'MEDIUMBLOB':
			case 'LONGBLOB':
			case 'BLOB':
			case 'BINARY':
			case 'VARBINARY':
			case 'BIT':
			t = Buffer;

			case 'CHAR':
			case 'VARCHAR':
			case 'TINYTEXT':
			case 'MEDIUMTEXT':
			case 'LONGTEXT':
			case 'TEXT':
			case 'ENUM':
			case 'SET':
			case 'DECIMAL':
			case 'BIGINT':
			case 'TIME':
			case 'GEOMETRY':
			t = String; break;
		}
	}
	if(!t)
		throw new Error('unkown Type ' + netiveType);
	return t;
}

exports.convertType = convertType;
