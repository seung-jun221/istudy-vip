/**
 * 뿌리오 SMS 발송 서비스
 * https://ppurio.com API 연동
 *
 * API 플로우:
 * 1. 토큰 발급: POST /v1/token (Basic Auth)
 * 2. 메시지 발송: POST /v1/message (Bearer Token)
 */

// 뿌리오 API 설정
const PPURIO_CONFIG = {
  account: 'istudy0517', // 뿌리오 계정 ID
  apiKey: '3057babbebf4fbe2a83ae36b17a978d3cfb9bb2a94012f0245348ac3be9418c7',
  senderNumber: '0517151580', // 발신번호 (하이픈 제거)
  baseUrl: 'https://message.ppurio.com',
};

// SMS 발송 요청 타입
interface SendSmsRequest {
  to: string; // 수신번호
  message: string; // 메시지 내용
}

// SMS 발송 응답 타입
interface SendSmsResponse {
  success: boolean;
  messageId?: string;
  error?: string;
}

// 토큰 응답 타입
interface TokenResponse {
  token: string;
  type: string;
  expired: string;
}

/**
 * 전화번호 정규화 (하이픈 제거)
 */
function normalizePhoneNumber(phone: string): string {
  return phone.replace(/[^0-9]/g, '');
}

/**
 * Base64 인코딩 (브라우저/Node.js 호환)
 */
function encodeBase64(str: string): string {
  if (typeof btoa !== 'undefined') {
    // 브라우저 환경
    return btoa(str);
  } else {
    // Node.js 환경
    return Buffer.from(str).toString('base64');
  }
}

/**
 * 뿌리오 API 토큰 발급
 */
async function getAccessToken(): Promise<string | null> {
  try {
    // Basic Auth: Base64(account:apiKey)
    const credentials = `${PPURIO_CONFIG.account}:${PPURIO_CONFIG.apiKey}`;
    const basicAuth = encodeBase64(credentials);

    const response = await fetch(`${PPURIO_CONFIG.baseUrl}/v1/token`, {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${basicAuth}`,
      },
    });

    if (!response.ok) {
      console.error('토큰 발급 실패:', response.status, response.statusText);
      return null;
    }

    const result: TokenResponse = await response.json();
    return result.token;
  } catch (error) {
    console.error('토큰 발급 오류:', error);
    return null;
  }
}

/**
 * SMS 발송
 */
export async function sendSms(request: SendSmsRequest): Promise<SendSmsResponse> {
  try {
    // 1. 토큰 발급
    const token = await getAccessToken();
    if (!token) {
      return {
        success: false,
        error: '인증 토큰 발급에 실패했습니다.',
      };
    }

    // 2. 메시지 발송
    const now = new Date();
    const sendTime = now.toISOString().replace(/[-:T.Z]/g, '').slice(0, 14); // YYYYMMDDHHmmss

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
        content: request.message,
        targets: [
          {
            to: normalizePhoneNumber(request.to),
          },
        ],
        refKey: `istudy_${Date.now()}`, // 고유 참조 키
        rejectType: 'AD', // 광고성 메시지 거부 타입
      }),
    });

    const result = await response.json();

    if (response.ok && result.code === '1000') {
      return {
        success: true,
        messageId: result.messageKey,
      };
    } else {
      console.error('SMS 발송 실패:', result);
      return {
        success: false,
        error: result.description || result.message || 'SMS 발송에 실패했습니다.',
      };
    }
  } catch (error) {
    console.error('SMS 발송 오류:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'SMS 발송 중 오류가 발생했습니다.',
    };
  }
}

/**
 * 설명회 예약 완료 문자 발송
 */
export async function sendReservationConfirmSms(params: {
  studentName: string;
  parentPhone: string;
  eventDate: string;
  eventTime: string;
  location?: string;
}): Promise<SendSmsResponse> {
  const { studentName, parentPhone, eventDate, eventTime, location } = params;

  const message = `[아이스터디 수리탐구]
${studentName} 학생의 설명회 예약이 완료되었습니다.

일시: ${eventDate} ${eventTime}
${location ? `장소: ${location}` : ''}
문의: 051-715-1580`;

  return sendSms({
    to: parentPhone,
    message: message.trim(),
  });
}

/**
 * 대기 신청 완료 문자 발송
 */
export async function sendWaitlistConfirmSms(params: {
  studentName: string;
  parentPhone: string;
  eventDate?: string;
}): Promise<SendSmsResponse> {
  const { studentName, parentPhone, eventDate } = params;

  const message = `[아이스터디 수리탐구]
${studentName} 학생의 대기 신청이 완료되었습니다.
${eventDate ? `희망일: ${eventDate}` : ''}
자리가 나면 연락드리겠습니다.

문의: 051-715-1580`;

  return sendSms({
    to: parentPhone,
    message: message.trim(),
  });
}

export default {
  sendSms,
  sendReservationConfirmSms,
  sendWaitlistConfirmSms,
};
