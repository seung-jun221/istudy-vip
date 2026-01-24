import { useState } from 'react';
import { Link } from 'react-router-dom';
import Input from '../common/Input';
import Button from '../common/Button';
import { validatePhone } from '../../utils/format';
import { useConsulting } from '../../context/ConsultingContext';
import { supabase, hashPassword } from '../../utils/supabase';

export default function ConsultingCheck({ onBack, onResult, onEntranceTestResult }) {
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const { showToast, setLoading } = useConsulting();

  const handlePhoneChange = (e) => {
    const value = e.target.value.replace(/[^0-9]/g, '');
    let formatted = value;

    if (value.length >= 4 && value.length <= 7) {
      formatted = value.slice(0, 3) + '-' + value.slice(3);
    } else if (value.length >= 8) {
      formatted =
        value.slice(0, 3) + '-' + value.slice(3, 7) + '-' + value.slice(7, 11);
    }

    setPhone(formatted);
  };

  const handleSubmit = async () => {
    if (!validatePhone(phone)) {
      showToast('올바른 전화번호를 입력해주세요.', 'error');
      return;
    }

    if (password.length < 4) {
      showToast('비밀번호를 4자리 이상 입력해주세요.', 'error');
      return;
    }

    setLoading(true);

    try {
      const hashedPassword = hashPassword(password);

      // 1. 컨설팅 예약 조회 (취소된 예약 제외)
      const { data: consultingReservations, error: consultingError } = await supabase
        .from('consulting_reservations')
        .select('*, consulting_slots(*)')
        .eq('parent_phone', phone)
        .neq('status', 'cancelled')
        .neq('status', 'auto_cancelled')
        .order('created_at', { ascending: false });

      if (consultingError) throw consultingError;

      // 2. 입학테스트 예약 조회 (독립 예약만)
      const { data: entranceTestReservations, error: entranceError } = await supabase
        .from('test_reservations')
        .select('*, test_slots(*)')
        .eq('parent_phone', phone)
        .eq('reservation_type', 'entrance_test')
        .in('status', ['confirmed', '예약'])
        .order('created_at', { ascending: false });

      if (entranceError) throw entranceError;

      // 3. 비밀번호가 일치하는 예약 찾기
      const matchingConsulting = consultingReservations?.find(
        (r) => r.password === hashedPassword
      );

      const matchingEntranceTest = entranceTestReservations?.find(
        (r) => r.password === hashedPassword
      );

      // 4. 결과 처리
      if (!matchingConsulting && !matchingEntranceTest) {
        // 예약 자체가 없는 경우와 비밀번호가 틀린 경우 구분
        if (
          (!consultingReservations || consultingReservations.length === 0) &&
          (!entranceTestReservations || entranceTestReservations.length === 0)
        ) {
          showToast('예약 정보를 찾을 수 없습니다.', 'error');
        } else {
          showToast('비밀번호가 일치하지 않습니다.', 'error');
        }
        setLoading(false);
        return;
      }

      // 5. 둘 다 있는 경우 - 최신 예약 우선
      if (matchingConsulting && matchingEntranceTest) {
        const consultingDate = new Date(matchingConsulting.created_at);
        const entranceDate = new Date(matchingEntranceTest.created_at);

        if (entranceDate > consultingDate && onEntranceTestResult) {
          setLoading(false);
          onEntranceTestResult(matchingEntranceTest);
          return;
        }
      }

      // 6. 컨설팅 예약 결과 반환
      if (matchingConsulting) {
        if (
          consultingReservations.length > 0 &&
          matchingConsulting.id !== consultingReservations[0].id
        ) {
          showToast(
            '이전 예약 정보를 표시합니다.',
            'warning',
            3000
          );
        }
        setLoading(false);
        onResult(matchingConsulting);
        return;
      }

      // 7. 입학테스트 예약 결과 반환
      if (matchingEntranceTest && onEntranceTestResult) {
        setLoading(false);
        onEntranceTestResult(matchingEntranceTest);
        return;
      }

      showToast('예약 정보를 찾을 수 없습니다.', 'error');
      setLoading(false);
    } catch (error) {
      console.error('예약 조회 실패:', error);
      showToast('예약 조회 중 오류가 발생했습니다.', 'error');
      setLoading(false);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter') {
      handleSubmit();
    }
  };

  return (
    <div className="space-y-4">
      <p className="text-gray-600 mb-4">
        예약 시 등록한 연락처와 비밀번호를 입력해주세요.
      </p>

      <Input
        label="학부모 연락처"
        type="tel"
        value={phone}
        onChange={handlePhoneChange}
        placeholder="010-0000-0000"
        required
        onKeyPress={handleKeyPress}
      />

      <Input
        label="비밀번호"
        type="password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        placeholder="예약 시 설정한 비밀번호"
        required
        onKeyPress={handleKeyPress}
      />

      {/* 비밀번호 재설정 안내 */}
      <div className="info-box" style={{ fontSize: '13px', padding: '12px' }}>
        💡 비밀번호를 잊으셨나요?{' '}
        <Link
          to="/consulting/password-reset"
          style={{
            color: '#1976d2',
            textDecoration: 'underline',
            fontWeight: '500',
          }}
        >
          비밀번호 재설정
        </Link>
      </div>

      <div className="flex gap-3">
        <Button type="button" variant="secondary" onClick={onBack}>
          ← 뒤로
        </Button>
        <Button onClick={handleSubmit}>예약 확인하기</Button>
      </div>
    </div>
  );
}
