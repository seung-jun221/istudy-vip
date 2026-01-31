/**
 * Netlify Serverless Function: SMS 발송
 * 뿌리오 API를 서버 측에서 호출하여 CORS 문제 해결
 */

const PPURIO_CONFIG = {
  account: 'istudysj',
  apiKey: '3057babbebf4fbe2a83ae36b17a978d3cfb9bb2a94012f0245348ac3be9418c7',
  senderNumber: '0517151580',
  baseUrl: 'https://message.ppurio.com',
};

/**
 * 뿌리오 API 토큰 발급
 */
async function getAccessToken() {
  const credentials = `${PPURIO_CONFIG.account}:${PPURIO_CONFIG.apiKey}`;
  const basicAuth = Buffer.from(credentials).toString('base64');

  const response = await fetch(`${PPURIO_CONFIG.baseUrl}/v1/token`, {
    method: 'POST',
    headers: {
      'Authorization': `Basic ${basicAuth}`,
    },
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`토큰 발급 실패: ${response.status} - ${errorText}`);
  }

  const result = await response.json();
  return result.token;
}

/**
 * SMS 발송
 */
async function sendSms(to, message) {
  // 1. 토큰 발급
  const token = await getAccessToken();

  // 2. 전화번호 정규화
  const normalizedPhone = to.replace(/[^0-9]/g, '');

  // 3. 메시지 발송
  const response = await fetch(`${PPURIO_CONFIG.baseUrl}/v1/message`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    },
    body: JSON.stringify({
      account: PPURIO_CONFIG.account,
      messageType: 'SMS',
      from: PPURIO_CONFIG.senderNumber,
      content: message,
      targets: [{ to: normalizedPhone }],
      refKey: `istudy_${Date.now()}`,
    }),
  });

  const result = await response.json();

  if (!response.ok || result.code !== '1000') {
    throw new Error(result.description || result.message || 'SMS 발송 실패');
  }

  return {
    success: true,
    messageKey: result.messageKey,
  };
}

/**
 * Netlify Function Handler
 */
exports.handler = async (event, context) => {
  // CORS 헤더
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Content-Type': 'application/json',
  };

  // OPTIONS 요청 처리 (CORS preflight)
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  // POST만 허용
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ error: 'Method not allowed' }),
    };
  }

  try {
    const { to, message, type, params } = JSON.parse(event.body);

    let finalMessage = message;

    // 타입별 메시지 생성
    if (type === 'reservation' && params) {
      const { studentName, eventDate, eventTime, location } = params;
      finalMessage = `[아이스터디 수리탐구]
${studentName} 학생의 설명회 예약이 완료되었습니다.

일시: ${eventDate} ${eventTime}
${location ? `장소: ${location}` : ''}
문의: 051-715-1580`.trim();
    } else if (type === 'waitlist' && params) {
      const { studentName, eventDate } = params;
      finalMessage = `[아이스터디 수리탐구]
${studentName} 학생의 대기 신청이 완료되었습니다.
${eventDate ? `희망일: ${eventDate}` : ''}
자리가 나면 연락드리겠습니다.

문의: 051-715-1580`.trim();
    }

    if (!to || !finalMessage) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: '수신번호와 메시지가 필요합니다.' }),
      };
    }

    const result = await sendSms(to, finalMessage);

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify(result),
    };
  } catch (error) {
    console.error('SMS 발송 오류:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: error.message }),
    };
  }
};
