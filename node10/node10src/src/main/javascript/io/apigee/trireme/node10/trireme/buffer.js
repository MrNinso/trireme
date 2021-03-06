// Copyright Joyent, Inc. and other Node contributors.
//
// Permission is hereby granted, free of charge, to any person obtaining a
// copy of this software and associated documentation files (the
// "Software"), to deal in the Software without restriction, including
// without limitation the rights to use, copy, modify, merge, publish,
// distribute, sublicense, and/or sell copies of the Software, and to permit
// persons to whom the Software is furnished to do so, subject to the
// following conditions:
//
// The above copyright notice and this permission notice shall be included
// in all copies or substantial portions of the Software.
//
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS
// OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
// MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN
// NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM,
// DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR
// OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE
// USE OR OTHER DEALINGS IN THE SOFTWARE.

var assert = require('assert');

/*
 * This is the function that wires up all this good JavaScript code to the Java-based
 * Buffer class. That way we can use all the existing Java-based "BufferImpl" code.
 * It gets called the first time that the "buffer" class is loaded.
 */
exports._setNativePrototype = function(nativeBuf) {
  nativeBuf.INSPECT_MAX_BYTES = 50;

function clamp(index, len, defaultValue) {
  if (typeof index !== 'number') return defaultValue;
  index = ~~index;  // Coerce to integer.
  if (index >= len) return len;
  if (index >= 0) return index;
  index += len;
  if (index >= 0) return index;
  return 0;
}

function toHex(n) {
  if (n < 16) return '0' + n.toString(16);
  return n.toString(16);
}

nativeBuf.isEncoding = function(encoding) {
  switch (encoding && encoding.toLowerCase()) {
    case 'hex':
    case 'utf8':
    case 'utf-8':
    case 'ascii':
    case 'binary':
    case 'base64':
    case 'ucs2':
    case 'ucs-2':
    case 'utf16le':
    case 'utf-16le':
    case 'raw':
      return true;

    default:
      return false;
  }
};



nativeBuf.poolSize = 8 * 1024;
var pool;

function allocPool() {
  pool = new SlowBuffer(Buffer.poolSize);
  pool.used = 0;
}


// Static methods
nativeBuf.isBuffer = function isBuffer(b) {
  return b instanceof Buffer;
};

nativeBuf.byteLength = function(str, enc) {
  var ret;
  str = str + '';
  switch (enc) {
    case 'ascii':
    case 'binary':
    case 'raw':
      ret = str.length;
      break;
    case 'ucs2':
    case 'ucs-2':
    case 'utf16le':
    case 'utf-16le':
      ret = str.length * 2;
      break;
    case 'hex':
      ret = str.length >>> 1;
      break;
    default:
      ret = Buffer._byteLength(str, enc);
  }
  return ret;
};


// Inspect
nativeBuf.prototype.inspect = function inspect() {
  var out = [],
      len = this.length,
      name = this.constructor.name;

  for (var i = 0; i < len; i++) {
    out[i] = toHex(this[i]);
    if (i == nativeBuf.INSPECT_MAX_BYTES) {
      out[i + 1] = '...';
      break;
    }
  }

  return '<' + name + ' ' + out.join(' ') + '>';
};


nativeBuf.prototype.get = function get(offset) {
  if (offset < 0 || offset >= this.length)
    throw new RangeError('offset is out of bounds');
  return this[offset];
};


nativeBuf.prototype.set = function set(offset, v) {
  if (offset < 0 || offset >= this.length)
    throw new RangeError('offset is out of bounds');
  return this[offset] = v;
};


// write(string, offset = 0, length = buffer.length-offset, encoding = 'utf8')
nativeBuf.prototype.write = function(string, offset, length, encoding) {
  // Support both (string, offset, length, encoding)
  // and the legacy (string, encoding, offset, length)
  if (isFinite(offset)) {
    if (!isFinite(length)) {
      encoding = length;
      length = undefined;
    }
  } else {  // legacy
    var swap = encoding;
    encoding = offset;
    offset = length;
    length = swap;
  }

  offset = +offset || 0;
  var remaining = this.length - offset;
  if (!length) {
    length = remaining;
  } else {
    length = +length;
    if (length > remaining) {
      length = remaining;
    }
  }
  encoding = String(encoding || 'utf8').toLowerCase();

  if (string.length > 0 && (length < 0 || offset < 0))
    throw new RangeError('attempt to write beyond buffer bounds');

  var ret;
  switch (encoding) {
    case 'hex':
      ret = this.hexWrite(string, offset, length, nativeBuf);
      break;

    case 'utf8':
    case 'utf-8':
      ret = this.utf8Write(string, offset, length, nativeBuf);
      break;

    case 'ascii':
      ret = this.asciiWrite(string, offset, length, nativeBuf);
      break;

    case 'binary':
      ret = this.binaryWrite(string, offset, length, nativeBuf);
      break;

    case 'base64':
      // Warning: maxLength not taken into account in base64Write
      ret = this.base64Write(string, offset, length, nativeBuf);
      break;

    case 'ucs2':
    case 'ucs-2':
    case 'utf16le':
    case 'utf-16le':
      ret = this.ucs2Write(string, offset, length, nativeBuf);
      break;

    default:
      throw new TypeError('Unknown encoding: ' + encoding);
  }

  return ret;
};

nativeBuf.prototype.toJSON = function() {
  return Array.prototype.slice.call(this, 0);
};


// toString(encoding, start=0, end=buffer.length)
nativeBuf.prototype.toString = function(encoding, start, end) {
  encoding = String(encoding || 'utf8').toLowerCase();

  if (typeof start !== 'number' || start < 0) {
    start = 0;
  } else if (start > this.length) {
    start = this.length;
  }

  if (typeof end !== 'number' || end > this.length) {
    end = this.length;
  } else if (end < 0) {
    end = 0;
  }

  switch (encoding) {
    case 'hex':
      return this.hexSlice(start, end);

    case 'utf8':
    case 'utf-8':
      return this.utf8Slice(start, end);

    case 'ascii':
      return this.asciiSlice(start, end);

    case 'binary':
      return this.binarySlice(start, end);

    case 'base64':
      return this.base64Slice(start, end);

    case 'ucs2':
    case 'ucs-2':
    case 'utf16le':
    case 'utf-16le':
      return this.ucs2Slice(start, end);

    default:
      throw new TypeError('Unknown encoding: ' + encoding);
  }
};


// fill(value, start=0, end=buffer.length)
nativeBuf.prototype.fill = function fill(value, start, end) {
  value || (value = 0);
  start || (start = 0);
  end || (end = this.length);

  if (typeof value === 'string') {
    value = value.charCodeAt(0);
  }
  if (typeof value !== 'number' || isNaN(value)) {
    throw new TypeError('value is not a number');
  }

  if (end < start) throw new RangeError('end < start');

  // Fill 0 bytes; we're done
  if (end === start) return 0;
  if (this.length == 0) return 0;

  if (start < 0 || start >= this.length) {
    throw new RangeError('start out of bounds');
  }

  if (end < 0 || end > this.length) {
    throw new RangeError('end out of bounds');
  }

  return this._fill(value, start, end);
};


nativeBuf.concat = function(list, length) {
  if (!Array.isArray(list)) {
    throw new TypeError('Usage: Buffer.concat(list, [length])');
  }

  if (list.length === 0) {
    return new Buffer(0);
  } else if (list.length === 1) {
    return list[0];
  }

  if (typeof length !== 'number') {
    length = 0;
    for (var i = 0; i < list.length; i++) {
      var buf = list[i];
      length += buf.length;
    }
  }

  var buffer = new Buffer(length);
  var pos = 0;
  for (var i = 0; i < list.length; i++) {
    var buf = list[i];
    buf.copy(buffer, pos);
    pos += buf.length;
  }
  return buffer;
};




// copy(targetBuffer, targetStart=0, sourceStart=0, sourceEnd=buffer.length)
nativeBuf.prototype.copy = function(target, target_start, start, end) {
  // set undefined/NaN or out of bounds values equal to their default
  if (!(target_start >= 0)) target_start = 0;
  if (!(start >= 0)) start = 0;
  if (!(end < this.length)) end = this.length;

  // Copy 0 bytes; we're done
  if (end === start ||
      target.length === 0 ||
      this.length === 0 ||
      start > this.length)
    return 0;

  if (end < start)
    throw new RangeError('sourceEnd < sourceStart');

  if (target_start >= target.length)
    throw new RangeError('targetStart out of bounds');

  if (target.length - target_start < end - start)
    end = target.length - target_start + start;

  return this._copy(target,
                    target_start + (target.offset || 0),
                    start, end);
};


// slice(start, end)
nativeBuf.prototype.slice = function(start, end) {
  var len = this.length;
  start = clamp(start, len, 0);
  end = clamp(end, len, len);
  return new Buffer(this, end - start, start);
};

/*
 * Need to make sure that buffer isn't trying to write out of bounds.
 * This check is far too slow internally for fast buffers.
 */
function checkOffset(offset, ext, length) {
  if ((offset % 1) !== 0 || offset < 0)
    throw new RangeError('offset is not uint');
  if (offset + ext > length)
    throw new RangeError('Trying to access beyond buffer length');
}


nativeBuf.prototype.readUInt8 = function(offset, noAssert) {
  if (!noAssert)
    checkOffset(offset, 1, this.length);
  return this[offset];
};


function readUInt16(buffer, offset, isBigEndian) {
  var val = 0;
  if (isBigEndian) {
    val = buffer[offset] << 8;
    val |= buffer[offset + 1];
  } else {
    val = buffer[offset];
    val |= buffer[offset + 1] << 8;
  }

  return val;
}


nativeBuf.prototype.readUInt16LE = function(offset, noAssert) {
  if (!noAssert)
    checkOffset(offset, 2, this.length);
  return readUInt16(this, offset, false, noAssert);
};


nativeBuf.prototype.readUInt16BE = function(offset, noAssert) {
  if (!noAssert)
    checkOffset(offset, 2, this.length);
  return readUInt16(this, offset, true, noAssert);
};

nativeBuf.prototype.readUInt32LE = function(offset, noAssert) {
  if (!noAssert)
    checkOffset(offset, 4, this.length);
  return this._readUint32(offset, false);
};


nativeBuf.prototype.readUInt32BE = function(offset, noAssert) {
  if (!noAssert)
    checkOffset(offset, 4, this.length);
  return this._readUint32(offset, true);
};


/*
 * Signed integer types, yay team! A reminder on how two's complement actually
 * works. The first bit is the signed bit, i.e. tells us whether or not the
 * number should be positive or negative. If the two's complement value is
 * positive, then we're done, as it's equivalent to the unsigned representation.
 *
 * Now if the number is positive, you're pretty much done, you can just leverage
 * the unsigned translations and return those. Unfortunately, negative numbers
 * aren't quite that straightforward.
 *
 * At first glance, one might be inclined to use the traditional formula to
 * translate binary numbers between the positive and negative values in two's
 * complement. (Though it doesn't quite work for the most negative value)
 * Mainly:
 *  - invert all the bits
 *  - add one to the result
 *
 * Of course, this doesn't quite work in Javascript. Take for example the value
 * of -128. This could be represented in 16 bits (big-endian) as 0xff80. But of
 * course, Javascript will do the following:
 *
 * > ~0xff80
 * -65409
 *
 * Whoh there, Javascript, that's not quite right. But wait, according to
 * Javascript that's perfectly correct. When Javascript ends up seeing the
 * constant 0xff80, it has no notion that it is actually a signed number. It
 * assumes that we've input the unsigned value 0xff80. Thus, when it does the
 * binary negation, it casts it into a signed value, (positive 0xff80). Then
 * when you perform binary negation on that, it turns it into a negative number.
 *
 * Instead, we're going to have to use the following general formula, that works
 * in a rather Javascript friendly way. I'm glad we don't support this kind of
 * weird numbering scheme in the kernel.
 *
 * (BIT-MAX - (unsigned)val + 1) * -1
 *
 * The astute observer, may think that this doesn't make sense for 8-bit numbers
 * (really it isn't necessary for them). However, when you get 16-bit numbers,
 * you do. Let's go back to our prior example and see how this will look:
 *
 * (0xffff - 0xff80 + 1) * -1
 * (0x007f + 1) * -1
 * (0x0080) * -1
 */

nativeBuf.prototype.readInt8 = function(offset, noAssert) {
  if (!noAssert)
    checkOffset(offset, 1, this.length);
  if (!(this[offset] & 0x80))
    return (this[offset]);
  return ((0xff - this[offset] + 1) * -1);
};


function readInt16(buffer, offset, isBigEndian) {
  var val = readUInt16(buffer, offset, isBigEndian);

  if (!(val & 0x8000))
    return val;
  return (0xffff - val + 1) * -1;
}


nativeBuf.prototype.readInt16LE = function(offset, noAssert) {
  if (!noAssert)
    checkOffset(offset, 2, this.length);
  return readInt16(this, offset, false);
};


nativeBuf.prototype.readInt16BE = function(offset, noAssert) {
  if (!noAssert)
    checkOffset(offset, 2, this.length);
  return readInt16(this, offset, true);
};

nativeBuf.prototype.readInt32LE = function(offset, noAssert) {
  if (!noAssert)
    checkOffset(offset, 4, this.length);
  return this._readInt32(offset, false);
};


nativeBuf.prototype.readInt32BE = function(offset, noAssert) {
  if (!noAssert)
    checkOffset(offset, 4, this.length);
  return this._readInt32(offset, true);
};

nativeBuf.prototype.readFloatLE = function(offset, noAssert) {
  var i = this.readInt32LE(offset, noAssert);
  return nativeBuf._toFloat(i);
};


nativeBuf.prototype.readFloatBE = function(offset, noAssert) {
  var i = this.readInt32BE(offset, noAssert);
  return nativeBuf._toFloat(i);
};


nativeBuf.prototype.readDoubleLE = function(offset, noAssert) {
  if (!noAssert)
    checkOffset(offset, 8, this.length);
  return this._readDoubleLE(offset);
};


nativeBuf.prototype.readDoubleBE = function(offset, noAssert) {
  if (!noAssert)
    checkOffset(offset, 8, this.length);
  return this._readDoubleBE(offset);
};


function checkInt(buffer, value, offset, ext, max, min) {
  if ((value % 1) !== 0 || value > max || value < min)
    throw TypeError('value is out of bounds');
  if ((offset % 1) !== 0 || offset < 0)
    throw TypeError('offset is not uint');
  if (offset + ext > buffer.length || buffer.length + offset < 0)
    throw RangeError('Trying to write outside buffer length');
}


nativeBuf.prototype.writeUInt8 = function(value, offset, noAssert) {
  if (!noAssert)
    checkInt(this, value, offset, 1, 0xff, 0);
  this[offset] = value;
};


function writeUInt16(buffer, value, offset, isBigEndian) {
  if (isBigEndian) {
    buffer[offset] = (value & 0xff00) >>> 8;
    buffer[offset + 1] = value & 0x00ff;
  } else {
    buffer[offset + 1] = (value & 0xff00) >>> 8;
    buffer[offset] = value & 0x00ff;
  }
}


nativeBuf.prototype.writeUInt16LE = function(value, offset, noAssert) {
  if (!noAssert)
    checkInt(this, value, offset, 2, 0xffff, 0);
  writeUInt16(this, value, offset, false);
};


nativeBuf.prototype.writeUInt16BE = function(value, offset, noAssert) {
  if (!noAssert)
    checkInt(this, value, offset, 2, 0xffff, 0);
  writeUInt16(this, value, offset, true);
};

nativeBuf.prototype.writeUInt32LE = function(value, offset, noAssert) {
  if (!noAssert)
    checkInt(this, value, offset, 4, 0xffffffff, 0);
  this._writeUint32(offset, value, false);
};


nativeBuf.prototype.writeUInt32BE = function(value, offset, noAssert) {
  if (!noAssert)
    checkInt(this, value, offset, 4, 0xffffffff, 0);
  this._writeUint32(offset, value, true);
};


/*
 * We now move onto our friends in the signed number category. Unlike unsigned
 * numbers, we're going to have to worry a bit more about how we put values into
 * arrays. Since we are only worrying about signed 32-bit values, we're in
 * slightly better shape. Unfortunately, we really can't do our favorite binary
 * & in this system. It really seems to do the wrong thing. For example:
 *
 * > -32 & 0xff
 * 224
 *
 * What's happening above is really: 0xe0 & 0xff = 0xe0. However, the results of
 * this aren't treated as a signed number. Ultimately a bad thing.
 *
 * What we're going to want to do is basically create the unsigned equivalent of
 * our representation and pass that off to the wuint* functions. To do that
 * we're going to do the following:
 *
 *  - if the value is positive
 *      we can pass it directly off to the equivalent wuint
 *  - if the value is negative
 *      we do the following computation:
 *         mb + val + 1, where
 *         mb   is the maximum unsigned value in that byte size
 *         val  is the Javascript negative integer
 *
 *
 * As a concrete value, take -128. In signed 16 bits this would be 0xff80. If
 * you do out the computations:
 *
 * 0xffff - 128 + 1
 * 0xffff - 127
 * 0xff80
 *
 * You can then encode this value as the signed version. This is really rather
 * hacky, but it should work and get the job done which is our goal here.
 */

nativeBuf.prototype.writeInt8 = function(value, offset, noAssert) {
  if (!noAssert)
    checkInt(this, value, offset, 1, 0x7f, -0x80);
  if (value < 0) value = 0xff + value + 1;
  this[offset] = value;
};


nativeBuf.prototype.writeInt16LE = function(value, offset, noAssert) {
  if (!noAssert)
    checkInt(this, value, offset, 2, 0x7fff, -0x8000);
  if (value < 0) value = 0xffff + value + 1;
  writeUInt16(this, value, offset, false);
};


nativeBuf.prototype.writeInt16BE = function(value, offset, noAssert) {
  if (!noAssert)
    checkInt(this, value, offset, 2, 0x7fff, -0x8000);
  if (value < 0) value = 0xffff + value + 1;
  writeUInt16(this, value, offset, true);
};


nativeBuf.prototype.writeInt32LE = function(value, offset, noAssert) {
  if (!noAssert)
    checkInt(this, value, offset, 4, 0x7fffffff, -0x80000000);
  this._writeInt32(offset, value, false);
};


nativeBuf.prototype.writeInt32BE = function(value, offset, noAssert) {
  if (!noAssert)
    checkInt(this, value, offset, 4, 0x7fffffff, -0x80000000);
  this._writeInt32(offset, value, true);
};


nativeBuf.prototype.writeFloatLE = function(value, offset, noAssert) {
  if (!noAssert)
    checkOffset(offset, 4, this.length);
  var i = nativeBuf._fromFloat(value);
  this._writeInt32(offset, i, false);
};


nativeBuf.prototype.writeFloatBE = function(value, offset, noAssert) {
  if (!noAssert)
    checkOffset(offset, 4, this.length);
  var i = nativeBuf._fromFloat(value);
  this._writeInt32(offset, i, true);
};


nativeBuf.prototype.writeDoubleLE = function(value, offset, noAssert) {
  if (!noAssert)
    checkOffset(offset, 8, this.length);
  this._writeDoubleLE(value, offset);
};


nativeBuf.prototype.writeDoubleBE = function(value, offset, noAssert) {
  if (!noAssert)
    checkOffset(offset, 8, this.length);
  this._writeDoubleBE(value, offset);
};
};

