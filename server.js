const express = require('express');
const axios = require('axios');
const bodyParser = require('body-parser');
const cors = require('cors');

// 创建 Express 应用
const app = express();
const port = process.env.PORT || 80;

// 使用中间件
app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// 获取环境变量
const APPID = process.env.APPID;
const APPSECRET = process.env.APPSECRET;

// 通用 API 端点
app.post('/api/count', async (req, res) => {
  const { action } = req.body;
  console.log(`收到请求，action: ${action}`, req.body);

  try {
    switch (action) {
      case 'getOpenid':
        await handleGetOpenid(req, res);
        break;
      case 'submitOrder':
        await handleSubmitOrder(req, res);
        break;
      default:
        res.status(400).json({ success: false, message: '未知的操作类型' });
    }
  } catch (error) {
    console.error('处理请求出错:', error);
    res.status(500).json({ success: false, message: error.message || '服务器内部错误' });
  }
});

// 处理获取 openid 的请求
async function handleGetOpenid(req, res) {
  const { code } = req.body;
  
  if (!code) {
    return res.status(400).json({ success: false, message: '缺少 code 参数' });
  }

  try {
    // 调用微信 API 获取 openid
    const url = `https://api.weixin.qq.com/sns/jscode2session?appid=${APPID}&secret=${APPSECRET}&js_code=${code}&grant_type=authorization_code`;
    const response = await axios.get(url);
    
    console.log('微信返回数据:', response.data);
    
    if (response.data.errcode) {
      throw new Error(`微信API错误: ${response.data.errmsg}`);
    }
    
    // 返回 openid 给小程序
    res.json({
      success: true,
      openid: response.data.openid,
      session_key: response.data.session_key
    });
  } catch (error) {
    console.error('获取 openid 失败:', error);
    res.status(500).json({ success: false, message: '获取 openid 失败' });
  }
}

// 处理提交订单的请求
async function handleSubmitOrder(req, res) {
  const { openid, cartItems, totalPrice, customerName, orderTime, productName, productPrice, remarks, templateId } = req.body;
  
  if (!openid || !cartItems) {
    return res.status(400).json({ success: false, message: '订单数据不完整' });
  }

  try {
    // 这里可以添加将订单保存到数据库的逻辑
    console.log('接收到的订单数据:', { openid, cartItems, totalPrice });
    
    // 模拟订单处理
    const orderId = `ORD${Date.now()}`;
    
    // 如果提供了模板ID，可以发送订阅消息
    if (templateId) {
      try {
        await sendSubscribeMessage(openid, templateId, {
          orderId,
          customerName,
          orderTime,
          productName,
          productPrice,
          remarks
        });
        console.log('订阅消息发送成功');
      } catch (msgError) {
        console.error('发送订阅消息失败:', msgError);
        // 订阅消息发送失败不影响订单提交
      }
    }
    
    res.json({
      success: true,
      orderId,
      message: '订单提交成功'
    });
  } catch (error) {
    console.error('处理订单失败:', error);
    res.status(500).json({ success: false, message: '订单处理失败' });
  }
}

// 发送订阅消息
async function sendSubscribeMessage(openid, templateId, data) {
  // 首先获取 access_token
  const tokenUrl = `https://api.weixin.qq.com/cgi-bin/token?grant_type=client_credential&appid=${APPID}&secret=${APPSECRET}`;
  const tokenResponse = await axios.get(tokenUrl);
  
  if (tokenResponse.data.errcode) {
    throw new Error(`获取access_token失败: ${tokenResponse.data.errmsg}`);
  }
  
  const accessToken = tokenResponse.data.access_token;
  
  // 准备发送订阅消息
  const msgUrl = `https://api.weixin.qq.com/cgi-bin/message/subscribe/send?access_token=${accessToken}`;
  
  // 构建消息数据
  const msgData = {
    touser: openid,
    template_id: templateId,
    page: 'pages/myOrders/myOrders',
    data: {
      // 根据模板配置字段
      thing1: { value: data.orderId || '新订单' },
      thing2: { value: data.customerName || '顾客' },
      time3: { value: data.orderTime || new Date().toLocaleString() },
      thing4: { value: data.productName || '商品' },
      amount5: { value: data.productPrice || '0.00' },
      thing6: { value: data.remarks || '无' }
    }
  };
  
  const msgResponse = await axios.post(msgUrl, msgData);
  console.log('订阅消息发送结果:', msgResponse.data);
  
  if (msgResponse.data.errcode !== 0) {
    throw new Error(`发送订阅消息失败: ${msgResponse.data.errmsg}`);
  }
  
  return msgResponse.data;
}

// 健康检查端点
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'healthy' });
});

// 启动服务器
app.listen(port, () => {
    console.log(`服务器运行在 http://localhost:${port}`);
    console.log(`${new Date().toISOString().replace('T', ' ').substring(0, 19)} 服务express-si9t部署express-si9t-009 : 启动成功`);
});
