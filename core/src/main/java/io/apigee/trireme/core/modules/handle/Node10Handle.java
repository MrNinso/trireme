/**
 * Copyright 2014 Apigee Corporation.
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in
 * all copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
 * SOFTWARE.
 */
package io.apigee.trireme.core.modules.handle;

import io.apigee.trireme.core.ScriptTask;
import io.apigee.trireme.core.internal.Charsets;
import io.apigee.trireme.core.internal.ScriptRunner;
import io.apigee.trireme.core.modules.Buffer;
import io.apigee.trireme.core.modules.Constants;
import io.apigee.trireme.spi.FunctionCaller;
import io.apigee.trireme.spi.ScriptCallable;
import org.mozilla.javascript.Context;
import org.mozilla.javascript.Function;
import org.mozilla.javascript.Scriptable;
import org.mozilla.javascript.ScriptableObject;

import java.nio.ByteBuffer;
import java.nio.charset.Charset;
import java.util.concurrent.atomic.AtomicInteger;

import static io.apigee.trireme.core.ArgUtils.*;

/**
 * This class implements the specific "handle" pattern that is required in Node.js 10.x.
 * It does it by adding methods and properties on the specified object that implement the required
 * interface. A "handle" object is used by the "net" Node.js module. In Trireme, we use it for TCP sockets,
 * standard input/output, and TTY input/output.
 */

class Node10Handle
    implements ScriptCallable, HandleWrapper.HandleListener

{
    private final HandleWrapper target;
    private final ScriptRunner runtime;

    private int byteCount;
    private final AtomicInteger writeQueueSize = new AtomicInteger();

    Node10Handle(HandleWrapper target, ScriptRunner runtime)
    {
        this.target = target;
        this.runtime = runtime;
    }

    void wrap()
    {
        target.put("close", target, new FunctionCaller(this, 1));
        target.put("writeBuffer", target, new FunctionCaller(this, 2));
        target.put("writeAsciiString", target, new FunctionCaller(this, 3));
        target.put("writeUtf8String", target, new FunctionCaller(this, 4));
        target.put("writeUcs2String", target, new FunctionCaller(this, 5));
        target.put("readStart", target, new FunctionCaller(this, 6));
        target.put("readStop", target, new FunctionCaller(this, 7));

        updateByteCount(0);
        target.put("writeQueueSize", target, 0);
    }

    @Override
    public Object call(Context cx, Scriptable scope, int op, Object[] args)
    {
        switch (op) {
        case 1:
            close(cx, args);
            break;
        case 2:
            return writeBuffer(cx, args);
        case 3:
            return writeAsciiString(cx, args);
        case 4:
            return writeUtf8String(cx, args);
        case 5:
            return writeUcs2String(cx, args);
        case 6:
            readStart(cx);
            break;
        case 7:
            readStop(cx);
            break;
        default:
            throw new IllegalArgumentException("Invalid method id");
        }
        return null;
    }

    private void updateByteCount(int count)
    {
        byteCount += count;
        target.put("bytes", target, byteCount);
    }

    private void incrementWriteQueueSize()
    {
        int newSize = writeQueueSize.incrementAndGet();
        target.put("writeQueueSize", target, newSize);
    }

    private void decrementWriteQueueSize()
    {
        int newSize = writeQueueSize.decrementAndGet();
        target.put("writeQueueSize", target, newSize);
    }

    private Function getOnRead()
    {
        return (Function)ScriptableObject.getProperty(target, "onread");
    }

    private void close(Context cx, Object[] args)
    {
        Function cb = functionArg(args, 0, false);
        target.close(cx);
        if (cb != null) {
            cb.call(cx, cb, target, null);
        }
    }

    private void readStart(Context cx)
    {
        runtime.clearErrno();
        target.readStart(cx, this);
    }

    private void readStop(Context cx)
    {
        runtime.clearErrno();
        target.readStop(cx);
    }

    @Override
    public void readComplete(final ByteBuffer buf)
    {
        // We read some data, so go back to the script thread and deliver it
        final Function onRead = getOnRead();
        runtime.enqueueTask(new ScriptTask() {
            @Override
            public void execute(Context cx, Scriptable scope)
            {
                if (onRead != null) {
                    Buffer.BufferImpl jbuf =
                        Buffer.BufferImpl.newBuffer(cx, target, buf, false);
                    runtime.clearErrno();
                    onRead.call(cx, onRead, target,
                                new Object[] { jbuf, 0, buf.remaining() });
                }
            }
        });
    }

    @Override
    public void readError(final String err)
    {
        final Function onRead = getOnRead();
        runtime.enqueueTask(new ScriptTask() {
                                @Override
                                public void execute(Context cx, Scriptable scope)
                                {
                                    if (onRead != null) {
                                        runtime.setErrno(err);
                                        onRead.call(cx, onRead, target, new Object[] { null, 0, 0 });
                                    }
                                }
                            });
    }

    @Override
    public void writeComplete(final HandleWrapper.WriteTracker tracker)
    {
        decrementWriteQueueSize();
        // Always call oncomplete in another tick -- we have to set a request on it before it can be
        // called, and furthermore in node 10, the caller only sets "oncomplete" after the write has returned.
        runtime.enqueueTask(new ScriptTask()
        {
            @Override
            public void execute(Context cx, Scriptable scope)
            {
                Object oc = ScriptableObject.getProperty(tracker.getRequest(), "oncomplete");
                if ((oc != null) && Context.getUndefinedValue().equals(oc)) {
                    Function onComplete = (Function) oc;
                    onComplete.call(cx, scope, target,
                                    new Object[]{Context.getUndefinedValue(), target, tracker.getRequest()});
                }
            }
        });
    }

    @Override
    public void writeError(final HandleWrapper.WriteTracker tracker, final String err)
    {
        decrementWriteQueueSize();
        runtime.enqueueTask(new ScriptTask()
        {
            @Override
            public void execute(Context cx, Scriptable scope)
            {
                Object oc = ScriptableObject.getProperty(tracker.getRequest(), "oncomplete");
                if ((oc != null) && Context.getUndefinedValue().equals(oc)) {
                    Function onComplete = (Function)oc;
                    onComplete.call(cx, scope, target,
                                    new Object[]{err, target, tracker.getRequest()});
                }
            }
        });
    }

    private Object writeBuffer(Context cx, Object[] args)
    {
        runtime.clearErrno();
        Buffer.BufferImpl jBuf = objArg(args, 0, Buffer.BufferImpl.class, true);
        ByteBuffer buf = jBuf.getBuffer();

        incrementWriteQueueSize();
        HandleWrapper.WriteTracker tracker = target.write(cx, buf, this);
        Scriptable req = cx.newObject(target);
        req.put("bytes", req, tracker.getBytesWritten());
        tracker.setRequest(req);
        return req;
    }

    private Object writeUtf8String(Context cx, Object[] args)
    {
        return writeString(cx, args, Charsets.UTF8);
    }

    private Object writeAsciiString(Context cx, Object[] args)
    {
        return writeString(cx, args, Charsets.ASCII);
    }

    private Object writeUcs2String(Context cx, Object[] args)
    {
        return writeString(cx, args, Charsets.UCS2);
    }

    private Object writeString(Context cx, Object[] args, Charset cs)
    {
        runtime.clearErrno();
        String s = stringArg(args, 0);

        incrementWriteQueueSize();
        HandleWrapper.WriteTracker tracker = target.write(cx, s, cs, this);
        Scriptable req = cx.newObject(target);
        req.put("bytes", req, tracker.getBytesWritten());
        tracker.setRequest(req);
        return req;
    }
}
