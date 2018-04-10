* 0.9.3: 04-10-2018:

Fix a bug in the Buffer implementation that was causing the "zlib"
library to produce corrupted output.

Upgrade to Rhino 1.7.10 which fixes a number of issues, including an
issue with the Object.prototype.isPropertyEnumerable() function on
certain built-in data types like String.

* 0.9.2: 03-16-2018:

Add environment variables so that the HTTP adapter, which is used
to embed Trireme inside other HTTP engines, can optionally
wrap each HTTP request with a "domain." Previous releases of
Trireme always did this, which prevented some errors and introduced
others.

* 0.9.1: 01-24-2018

Add an environment variable NODE_HTTP_MAX_SOCKETS that sets the 
value of the http.maxSockets global. This is an important
configuration parameter because the 0.10 family of Node.js sets
this parameter by default to 5, which artificially limits the 
performance of many applications.

* 0.9.0 09-28-2017:

[Issue 143](https://github.com/apigee/trireme/issues/143) Properly return undefined when accessing
a negative Buffer index.
[Issue 161](https://github.com/apigee/trireme/issues/161) Support a larger number of hashes
in crypto.createHash and crypto.createVerify, so that Trireme is more compatible with regular
Node, which uses a cipher list of OpenSSL which is much more lenient.

In addition:

* Upgrade to [Rhino 1.7.7.2](https://github.com/mozilla/rhino/releases/tag/Rhino1_7_7_2_Release).
See the release notes there for details of what was fixed.
* Pull code from a newer Node branch so that http.get() with numeric authorization does not
create an unitialized buffer.
* Fix the HTTP adapter (used in Apigee Edge) so that uncaught exceptions are properly bubbled up
to the top level of the script rather than crashing.
* Fix PBKDF2 support to work with Buffers as well as strings. crypto.pbkdf2 is now compatible
with "regular" Node.

* 0.8.9 02-01-2016:

This release fixes a few small bugs, especially in TLS. It also upgrades to
(Rhino 1.7.7.1)[https://github.com/mozilla/rhino/releases/tag/Rhino1_7_7_1_RELEASE],
which fixes a few other small bugs and vulnerabilities.

[Issue 137](https://github.com/apigee/trireme/issues/137) Properly follow symlinks in fs.readdir().
[Issue 139](https://github.com/apigee/trireme/issues/139) Support PKCS#8 keys for the crypto "createSign" method.
[Issue 144](https://github.com/apigee/trireme/issues/144) Properly handle intermediate TLS certs.
[Issue 145](https://github.com/apigee/trireme/issues/145) Create a launcher that emulates the
setup of Apigee Edge.

* 0.8.8 09-18-2015:

In addition to the fixes below, this release makes progress on support for Node.js 0.12. Both versions
0.10 and 0.12 are included in the "trireme" NPM package and in the default JAR. Users may now select
either version when starting the script.

Support for 0.12 is still experimental. Most modules work well, however the child_process module in general
is not complete and that hinders testing for some of the other modules.

[Issue 87](https://github.com/apigee/trireme/issues/87) Fix flow control for HTTP requests and responses that
use the HTTP adapter. This prevents OOMs when large messages are streamed using HTTP using the Netty
adapter, the servlet adapter, and on Apigee Edge.
[Issue 96](https://github.com/apigee/trireme/issues/96) Change the Buffer class to use much more code
from regular Node.js so that it is is more compatible.
[Issue 126](https://github.com/apigee/trireme/issues/126) Change the way that the class loader is set up
in the "trireme-support" module so that a custom class loader may be set up for the JAR files that
this module loads.
[Issue 128](https://github.com/apigee/trireme/issues/128) Fix the way that TLS/SSL ciphersuites are translated
from OpenSSL format to Java SSLEngine cipher suites. The new method is much more compatible with
OpenSSL and many more applications should work that depend on particular ciphers.

Also, some of the callbacks in the HTTP module were fixed in the HTTP adapter so that they work the same
way as they do without the adapter, such as the "close" and "finish" callbacks.

Sadly, Node.js 4.0 is out and much of the source code won't compile with the current version of Rhino
due to dependence on ES6 features. The Rhino project is making progress on ES6 support but it will take
some time. The Nashorn script engine in Java 8 cannot compile this code either due to a different
set of ES6 incompatibilities.

* 0.8.7 08-20-2015:

[Issue 124](https://github.com/apigee/trireme/issues/124) Add the "_implicitHeader" to the HTTP adapter,
because this undocumented function is used in some very common Compress middleware.
[Issue 125](https://github.com/apigee/trireme/issues/125) Fix command-line processing, which was swallowing
arguments that start with "--" even if they appear after the name of the script. This broke NPM.

* 0.8.6 18-Jun-2015:

In addition to a Rhino upgrade and the fixes below, this release is the first two support multiple versions
of Node. The default version is based on Node 0.10.32, but there is an alternate version based on
Node 0.11.15. Scripts based on both implementations may run at the same time in the same JVM,
using the same instance of NodeEnvironment, or using different instances.

To try the new version in embedded code, call "setNodeVersion" on NodeScript using the value "0.11.x",
or call "setDefaultNodeVersion" on NodeEnvironment.

We expect that the next version of Trireme will include support for 0.12, and it will be the default.

[Issue 115](https://github.com/apigee/trireme/issues/115) Add mappings for new TLS ciphers
introduced in Java 8.
[Issue 116](https://github.com/apigee/trireme/issues/116) Change process.memoryUsage() so that it correctly
reports a "heapUsed" number based on the amount of data that is actually free in the heap so that
scripts can use it to take action when memory is growing short.
[Issue 118](https://github.com/apigee/trireme/issues/118) Fix TLS verification so that it works properly
with ECDH-derived cipher suites. This was causing TLS connections to "www.facebook.com" to fail.
[Issue 119](https://github.com/apigee/trireme/issues/119) Handle thread pool exhaustion by blocking
the main thread rather than by exiting the script. This slows things down but makes the whole system
much more robust.
[Issue 114](https://github.com/apigee/trireme/issues/114) Fix TriremeServlet so that it properly reads
large bodies coming from the client without corruption.
[Issue 120](https://github.com/apigee/trireme/issues/120) Speed up Trireme startup.

Also, upgrade to Rhino 1.7.7. This fixes a bug with calling "toJSON" on certain Error objects, and
introduces support for native arrays, among many other things. (Native arrays like Int32Array are
used in an increasing number of Node projects since V8 supports them even without the --harmony flag.

* 0.8.5 14-Dec-2014:

[Issue 98](https://github.com/apigee/trireme/issues/98) Add support for the "trireme-support"
module, which initially has support only for the "loadJars" method, which loads JAR files into
the current script and scans them for "native" modules implemented in Java using the "NodeModule"
and "NodeScriptModule" interfaces.

* 0.8.4 5-Dec-2014:

This is a bug fix for a few important bugs. The next release may include some more refactoring.

* [Issue 90](https://github.com/apigee/trireme/issues/90) Make "attachments" to the HTTP adapter's request
object non-enumerable so that they don't blow up util.inspect.
* [Issue 91](https://github.com/apigee/trireme/issues/91) Support case-insensitive retrieval of environment
variables, like Windows. This makes variables like "Path" work on Windows.
* [Issue 92](https://github.com/apigee/trireme/issues/92) Fix the string encoding and decoding mechanisms so
that characters that are not valid for the current character set are converted into a "replacement" character
rather than causing string encoding to stop.
* [Issue 94](https://github.com/apigee/trireme/issues/94) Repeated HTTP requests sometimes fail because
of problems with resetting the state of the HTTP parser that the "http" module tries to cache. (Said caching
may be important with regular Node, but in Trireme is has no performance benefit.)

* 0.8.3 15-Oct-2014:

* Fix the error that happens when "dlopen" cannot find load a native code module. This bug was causing
recent versions of the "mongodb" module to fail -- now it will work.
* [Trireme JDBC Issue 1](https://github.com/apigee/trireme-jdbc/issues/1) Fix handling of NULL columns in
SQL parameters and in SQL results so that they actually return "null" when a column value is "SQL NULL"
set "SQL NULL" when a null parameter is passed.
* [Issue 80](https://github.com/apigee/trireme/issues/80) Implement a Java version of the "contextify"
native module. This makes it possible to use "jsdom," which would formerly not work because there
was no "contextify" available. This solution requires that "contextify" still be installed via NPM --
it only replaces the native code, not the JS code.
* Upgrade to Rhino 1.7R5pre4. This fixes an error caused when "util.format" tries to introspect on
an Error object.
* Add a generic way to write classes that will be loaded when specific native modules (with the ".node")
extension would be loaded by standard Node.js.
* Fix path and output handling for Trireme scripts spawned by Trireme. This allows "nodeunit" and "tap" to
work normally with Trireme.

# 0.8.2 01-Oct-2014:

* Take JavaScript code patches from Node.js 10.32.
* [Issue 59](https://github.com/apigee/trireme/issues/59) Add an internal module
to support the [trireme-jdbc](https://www.npmjs.org/package/trireme-jdbc)
module. This lets apps built on Trireme access databases using JDBC drivers.
* [Issue 79](https://github.com/apigee/trireme/issues/79) Re-factor the TLS
implementation to be based on the "Context" and "Connection" interfaces that
standard Node.js supports. This makes the TLS code much more compatible with
Node.js modules that depend on internal details of TLS.
* [Issue 86](https://github.com/apigee/trireme/issues/86): Support the internal
"natives" module so that modules that do horrible things like monkey-patch internal
Node.js source code can work on Trireme. This affects NPM 2.0.

* Add "setDisplayName()" to the NodeScript interface, making it possible to give
each Trireme script thread a unique name.
* Add "setDefaultTimeout()" to the HttpServerStub interface. This lets code
that embeds Trireme using the HTTP adapter can have HTTP requests time out even
if the user does not specify an explicit timeout.


# 0.8.1 09-Sep-2014:

* [Issue 66](https://github.com/apigee/trireme/issues/66) Use NIO to implement the datagram (aka UDP)
module for better performance.
* [Issue 81](https://github.com/apigee/trireme/issues/81) Remove Trireme's Java implementation of
"iconv-lite," which was not compatible with the version on NPM. The standard "iconv-lite" module now
works, although it is very slow for unusual character sets like "big5" because those are now implemented
in JavaScript rather than using native Java character sets. (ASCII, UTF8, and other standards still
use the Java platform and are as fast or faster than native Node.) This also fixes a bug with
recent versions of the Express / connect "body parser" middleware.
* [Issue 82](https://github.com/apigee/trireme/issues/82) Add fields to the HTTP adapter to prevent a race
condition when recent versions of Connect "send-static" middleware try to use undocumented internal
fields. (This only affects the "HTTP adapter" which is not used by all users of Trireme.)

Other issues:

* Upgrade to version 1.50 of Bouncy Castle.
* Fix path translation for filesystems mounted outside root (t-beckmann)
* Fix SSL support to always emit Error objects on error (t-beckmann)
* Fix /?/ UNC path prefix (t-beckmann)
* Unwrap Rhino "Wrapper" objects (t-beckmann)
* Fix "binary" character set to handle unsigned values properly (t-beckmann)
* A number of other small but important fixes from Thomas Beckmann. Thanks!


# 0.8.0 17-Jul-2014:

This release fixes many compatibility issues with standard Node. The most significant is that we have switched
from the old "org.mozilla.rhino" to "io.apigee.rhino", and to the latest release of 1.7R5pre3. This has
a lot of fixes that improve compatibility with V8.

Trireme itself will continue to function on older versions of Rhino, but for best results, follow the
POM and use the one that is specified here...

* [Issue 17](https://github.com/apigee/trireme/issues/17) Support DSA signing and verification to complete the
"crypto" module.
* [Issue 24](https://github.com/apigee/trireme/issues/24) Small tweaks to string encoding and decoding for
a small performance gain.
* [Issue 42](https://github.com/apigee/trireme/issues/42) Implement "trimLeft" and "trimRight" on the String
prototype even if they are not supported by the JavaScript runtime. This un-breaks the "jade" template
engine.
* [Issue 62](https://github.com/apigee/trireme/issues/62) Make Java 6 filesystem code throw the same errors
for symlinks and chmod as in Java 7.
* [Issue 63](https://github.com/apigee/trireme/issues/63) Allow process.argv to be replaced.
* [Issue 64](https://github.com/apigee/trireme/issues/64) Explicitly ignore the second argument to the global
"escape()" function. This un-breaks several Amazon AWS modules.
* [Issue 67](https://github.com/apigee/trireme/issues/67) Support Error.captureStackTrace() and
Error.prepareStackTrace() for better Node.js compatibility. This un-breaks the latest versions of Express
3.x.
* [Issue 68](https://github.com/apigee/trireme/issues/68) Support string arguments to Cipher.update that
have no encoding. This un-breaks the "httpntlm" module.
* [Issue 69](https://github.com/apigee/trireme/issues/69) Thanks to issue 67, update tests to Express 3.12.1
to ensure that it keeps working.
* [Issue 70](https://github.com/apigee/trireme/issues/70) Don't use the "NetworkPolicy" in the Sandbox to control
UDP ports. This makes it possible to send and receive UDP datagrams even if the NetworkPolicy does not
allow listening on any port.
* [Issue 71](https://github.com/apigee/trireme/issues/71) Upgrade from org.mozilla.rhino version 1.7R4 to
io.apigee.rhino version 1.7R5pre3. This adds a number of compatibility fixes that make more V8 code run
unmodified inside Trireme.

# 0.7.5 16-May-2014:

* [Issue 56](https://github.com/apigee/trireme/issues/56) Support Windows. This entails a bunch of work around
path handling and file permissions handling.
* [Issue 55](https://github.com/apigee/trireme/issues/55) Fix process.platform to guess the platform and return
a reasonable value.

With this release, by default Trireme will use the "os.name" system property to provide a value for the
"process.platform" property. Supported values are:

* darwin
* freebsd
* linux
* sunos
* win32

In addition, if a "Sandbox" is configured on the NodeEnvironment and the "setHideOSDetails" function is called, then
process.platform will instead return "java" as it did in previous releases.

This is an important change for the Windows platform as many parts of Node.js and third-party modules try to do
things differently on Windows.

# 0.7.4 15-May-2014:

* [Issue 54](https://github.com/apigee/trireme/issues/54) Properly raise an 'error' event if
child_process.spawn() is blocked due to the Sandbox being enabled.
* [Issue 53](https://github.com/apigee/trireme/issues/54) Add the new "trireme-xslt" module which uses native
Java XSLST processing and supports multiple threads. Also, create a compatible version of the
"node_xslt" module so that it may be used in Trireme as well without requiring libxml.

# 0.7.3 11-Apr-2014:

* [Issue 51](https://github.com/apigee/trireme/pull/51) Java 6 only: mkdir should return ENOENT on non-existent
parent directories.
* Fix ipc in child_process module so that it works.

With this fix, a Node.js app running in Trireme can "fork" a sub-process
and communicate via the IPC pipe using "send" on the child process and on the "process" object, as described
in the docs for the "child_process" module.

Handles are not yet supported, which means that a parent cannot send a TCP socket to a child and expect it to
process it.

Note that unlike regular Node.js, child scripts spawned using "fork" run inside the same JVM as the parent,
but with a totally different script context and in a separate thread. "IPC" communication happens using a
concurrent queue. Communication between parent and child via this mechanism should be very fast.

# 0.7.2 28-Mar-2014:

* [Issue 47](https://github.com/apigee/trireme/issues/47) When the executeModule() function is used to run
a script (instead of the more typical "execute()"), process.argv was not being generated in a consistent
way.
* [Issue 49](https://github.com/apigee/trireme/issues/49) HTTP responses that included an extra space at the
end of the status line (such as "HTTP/1.1 413 ") were resulting in a parsing error.

# 0.7.1 18-Mar-2014:

The biggest change in this release is that you must include at least two Jar files in order for Trireme to work:

* trireme-core
* trireme-node10src

The reason is that we are separating the Node.js-specific JavaScript code from the generic runtime in Java.
That way, in the future we may be able to support multiple versions of Node.js in the same runtime.

In the past, you only had to declare "trireme-core" in pom.xml and Maven will pick up everything. Now, you need
to include both packages listed above, or you will see the error: "No available Node.js implementation".

* Separate version-specific JavaScript code from the core runtime. This lays the groundwork for supporting
multiple versions of Node.js in the same instance of Trireme by using the same low-level support in Java
across all versions, and running different versions of the Node.js JavaScript code.
* [Issue 32](https://github.com/apigee/trireme/issues/32) Add a mechanism to cache compiled JavaScript
classes. This reduces memory usage and startup time in servers that host many Node.js scripts in a single
Trireme environment. The cache works by creating a SHA-256 hash of the source and using that as the key.
* [Issue 41](https://github.com/apigee/trireme/issues/41) Relative symbolic links were being mangled by the
code that implements the "sandbox" functionality. The result was that NPM didn't run. Now NPM can run on Trireme.
* [Issue 45](https://github.com/apigee/trireme/issues/45) Add an "extra class shutter" to Sandbox that allows
implementors to expand the list of Java classes that may be called directly from Trireme. By default, only
a few classes are supported, which means that Node.js code cannot normally invoke Java code directly unless
additional classes are whitelisted using this mechanism.

# 0.7.0 18-Feb-2014:

* [Issue 17](https://github.com/apigee/trireme/issues/17) Diffie-Hellman crypto
is now supported. DSA is currently not supported, and "SecureContext" won't be supported because it's specific to Node's
TLS implementation.
* [Issue 19](https://github.com/apigee/trireme/issues/19) NPM can now run on Trireme (as long as it is run on
Java 7). Various fixes to the "fs" module were necessary in order to make this happen.
* [Issue 25](https://github.com/apigee/trireme/issues/25) Move JavaScript source to a separate package called
"trireme-node10src". This package is required by "trireme-core". In the future, this may allow us to support
multiple versions of Node.js on a single instance of Trireme.
* [Issue 27](https://github.com/apigee/trireme/issues/27) Run the main loop of Trireme using a JavaScript adapted
from "node.js" rather than building it in Java. This makes Trireme more compatible with regular Node.
* [Issue 38](https://github.com/apigee/trireme/issues/38) Address an issue with callbacks that made MongoDB
fail to run.
* [Issue 39](https://github.com/apigee/trireme/issues/39) Add an option to the Sandbox to hide details of the CPU and
network interfaces from scripts. We will use this when embedding Trireme in a secure environment.
* [Issue 40](https://github.com/apigee/trireme/issues/40) Completion of the "tty" module, including support for
getting the window size, which allow "mocha" to run on Trireme.

# 0.6.9 22-Jan-2014:

* [Issue 35](https://github.com/apigee/trireme/issues/35) Add socket.localAddress, socket.remoteAddress, and socket.address() to HTTP requests
* [Issue 33](https://github.com/apigee/trireme/issues/33) Add "attachment" object to HTTP requests passed through HTTP adapter that is attached to the "request" object in JS.
* [Issue 22](https://github.com/apigee/trireme/issues/22) Stop sharing and sealing Rhino root context -- now every script can modify built-in object prototypes if they wish.
* [Issue 31](https://github.com/apigee/trireme/issues/31) Back off and retry if Rhino cannot compile a script because it is would result in more than 64K of bytecode.
* [Issue 17](https://github.com/apigee/trireme/issues/17) Implement crypto.Cipher and crypto.Decipher for DES, Triple DES, and AES
* [Issue 34](https://github.com/apigee/trireme/pull/34) Do not load character sets using Charset.forName() so that Trireme works outside the system classpath.
* Update modules from Node.js to 10.24
* Default Rhino optimization level to 9
* Numerous bug fixes.

# 0.6.8 17-Dec-2013:

* Issue 29: Assertion error while talking to HTTPS target.

A few build process changes.

# 0.6.7 31-Oct-2013:

Initial open-source release.
