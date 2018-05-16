const path = require('path');
const fs = require('fs');
const { exec, spawn } = require('child_process');
const zlib = require('zlib');
const Readable = require('stream').Readable;
const archiver = require('archiver');

router.get('/', function (req, res) {
    res.render('index')
})

/**
 * 单个文件下载
 */
router.get('/download', function (req, res) {
    let picture = req.query.picture;  //{ picture: [ 'cat.jpg', 'egg-wolf.jpg' ] }
    if (Array.isArray(picture)) {
        return res.send('只支持单个文件下载')
    }
    let currFile = path.resolve('dist', picture);
    fs.exists(currFile, function (exist) {
        if (exist) {
            //下载文件配置
            res.set({
                "Content-type": "application/octet-stream",  //配置下载
                "Content-Disposition": "attachment;filename=" + encodeURI(picture) //下载文件名
            });
            let fReadStream = fs.createReadStream(currFile);
            fReadStream.pipe(res);
        } else {
            res.set("Content-type", "text/html");
            res.send("file not exist!");
            res.end();
        }
    });
})

/**
 * 用模块压缩处理
 */
router.get('/download-archive', function (req, res) {
    let pictures = req.query.picture;
    let file_array = [];
    if (Array.isArray(pictures)) {
        file_array = pictures;
    } else {
        file_array.push(pictures);
    }
    if (!pictures || file_array.length === 0) {
        return res.send('下载文件数为空');
    }
    file_array = file_array.map(file => {
        return path.resolve('dist', file);
    })
    res.set({
        "Content-type": "application/octet-stream",  //配置下载
        "Content-Disposition": "attachment;filename=" + encodeURI('picture.zip') //下载文件名
    });

    var archive = archiver.create('zip', {
        zlib: { level: 9 } // Sets the compression level.
    });

    file_array.forEach(file => {
        archive.append(fs.createReadStream(file), { name: file });
    })
    archive.on('error', function (err) {
        res.send('download error');
    });
    archive.on('end', function (a) {
        console.log('end');
    });
    archive.finalize();
    archive.pipe(res);   //和输出流相接
})

/**
 * 用字段zlib压缩，只能处理单个文件
 */
router.get('/download-zlib', function (req, res) {
    let pictures = req.query.picture;
    let file_array = [];
    if (Array.isArray(pictures)) {
        file_array = pictures;
    } else {
        file_array.push(pictures);
    }
    if (file_array.length === 0) {
        return res.send('下载文件数为空');
    }
    res.set({
        "Content-type": "application/octet-stream",  //配置下载
        "Content-Disposition": "attachment;filename=" + encodeURI('picture.zip') //下载文件名
    });
    let i = 0;
    const readStream = new Readable({
        read() {
            file_array[i] = path.resolve('dist', file_array[i]);
            this.push(fs.readFileSync(file_array[i]));
            if (file_array.length <= ++i) {
                this.push(null);
            }
        }
    });
    readStream
        .pipe(zlib.createGzip())   //zlib只能处理压缩一个文件
        .pipe(res);
})

/**
 * 使用linux下的zip命令处理，使用子进程处理，没有用到额外模块
 */
router.get('/download-linux', function (req, res) {
    let pictures = req.query.picture;
    let file_array = [];
    if (Array.isArray(pictures)) {
        file_array = pictures;
    } else {
        file_array.push(pictures);
    }
    if (file_array.length === 0) {
        return res.send('下载文件数为空');
    }
    res.set({
        "Content-type": "application/octet-stream",  //配置下载
        "Content-Disposition": "attachment;filename=" + encodeURI('picture.zip') //下载文件名
    });
    file_array = file_array.map(file => {
        return path.resolve('dist', file);
    })
    let exePath = 'zip';
    let params = ['-r', '-'];
    params = params.concat(file_array)
    const zipProc = spawn(exePath, params, { cwd: path.resolve('dist') })  //子进程调用linux zip命令压缩后 数据流输入到stdout
    zipProc.stdout.pipe(res)

    zipProc.stderr.on('data', function (data) {
        console.log(data.toString())
    })
    zipProc.on('close', function (code) {
        console.log(code)
    })
})
