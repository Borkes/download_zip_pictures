const path = require('path');
const express = require('express');
const bodyParser = require('body-parser');
const app = express();

//统一捕获路由中async抛出的错误
const router = new express.Router();
const methods = ['get', 'post', 'put', 'delete'];
router.use(app);
for (let method of methods) {
    router[method] = function (...data) {
        if (method === 'get' && data.length === 1) return app.set(data[0]);
        const params = [];
        for (let item of data) {
            if (Object.prototype.toString.call(item) !== '[object AsyncFunction]') {
                params.push(item);
                continue;
            }
            const handle = function (...data) {
                const [req, res, next] = data;
                item(req, res, next).then().catch(next);
            };
            params.push(handle);
        }
        app[method](...params);
        return router;
    };
}
global.router = router;//全局路由，统一处理错误

// 设置模板目录
app.set('views', path.join(__dirname, 'views'));
// 设置模板引擎为 ejs
app.set('view engine', 'ejs');

// 设置静态文件目录
app.use(express.static(path.join(__dirname, 'dist')));

//解析body
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true })); //for parsing application/x-www-form-urlencoded

require('./routes/index.js')
app.use('/', (req, res, next) => {
    console.log(`${new Date()}:${req.method} ${req.originalUrl}`)
    next();
});

//错误传递下来未处理
app.use(function (err, req, res, next) {
    console.log(err)
    var new_err = new Error('系统繁忙');
    new_err.status = 404;
    return res.send({ code: 1001, message: new_err.message })
})
//监听未捕获错误
process.on('uncatchException', (err) => {
    console.log(err);
})
//监听8088端口
app.listen(8088, function () {
    console.log('server start in port 8088');
});
module.exports = app;