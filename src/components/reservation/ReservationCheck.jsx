import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import Input from '../common/Input';
import Button from '../common/Button';
import { validatePhone } from '../../utils/format';
import { useReservation } from '../../context/ReservationContext';
import { supabase, hashPassword } from '../../utils/supabase';

export default function ReservationCheck({
  onBack,
  onResult,
  prefilledPhone = '',
}) {
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const { showToast, setLoading } = useReservation();

  useEffect(() => {
    if (prefilledPhone) {
      setPhone(prefilledPhone);
      setTimeout(() => {
        document.querySelector('input[type="password"]')?.focus();
      }, 100);
    }
  }, [prefilledPhone]);

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

  const handlePasswordChange = (e) => {
    const value = e.target.value.replace(/[^0-9]/g, '').slice(0, 6);
    setPassword(value);
  };

  const handleSubmit = async () => {
    if (!validatePhone(phone)) {
      showToast('올바른 전화번호를 입력해주세요.', 'error');
      return;
    }

    if (password.length !== 6) {
      showToast('비밀번호는 6자리 숫자여야 합니다.', 'error');
      return;
    }

    setLoading(true);

    try {
      // 모든 예약 조회 (비밀번호 필터 제거)
      const { data: reservations, error } = await supabase
        .from('reservations')
        .select('*')
        .eq('parent_phone', phone)
        .in('status', ['예약', '대기'])
        .order('registered_at', { ascending: false });

      if (error) throw error;

      if (!reservations || reservations.length === 0) {
        setLoading(false);
        showToast('예약 정보를 찾을 수 없습니다.', 'error');
        return;
      }

      // ⭐ 비밀번호가 일치하는 예약 찾기 (모든 예약 검색)
      const hashedPassword = hashPassword(password);
      const matchingReservation = reservations.find(
        (r) => r.password === hashedPassword
      );

      if (!matchingReservation) {
        setLoading(false);
        showToast('비밀번호가 일치하지 않습니다.', 'error');
        return;
      }

      // 비밀번호가 일치하는 예약이 가장 최근이 아닐 경우 안내
      if (matchingReservation.id !== reservations[0].id) {
        showToast(
          '이전 예약 정보를 표시합니다. 최근 예약을 확인하려면 다른 비밀번호를 사용해주세요.',
          'warning',
          5000
        );
      }

      const reservation = matchingReservation;

      // seminar_slot_id로 슬롯 및 캠페인 정보 조회
      const { data: seminarSlot, error: slotError } = await supabase
        .from('seminar_slots')
        .select(`
          *,
          campaigns (*)
        `)
        .eq('id', reservation.seminar_slot_id)
        .single();

      if (slotError) throw slotError;

      // 호환성을 위해 seminar 형식으로 전달 (슬롯 + 캠페인 정보 병합)
      const seminar = {
        ...seminarSlot,
        ...seminarSlot.campaigns,
      };

      onResult({ ...reservation, seminar });
    } catch (error) {
      console.error('예약 조회 실패:', error);
      showToast('예약 조회 중 오류가 발생했습니다.', 'error');
    } finally {
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
      {prefilledPhone && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-4">
          <p className="text-blue-700 text-sm">
            ✅ 전화번호가 자동으로 입력되었습니다. 비밀번호만 입력해주세요.
          </p>
        </div>
      )}

      <p className="text-gray-600 mb-4">예약 정보를 입력해주세요.</p>

      <Input
        label="학부모 연락처"
        type="tel"
        value={phone}
        onChange={handlePhoneChange}
        placeholder="010-0000-0000"
        required
        disabled={!!prefilledPhone}
        onKeyPress={handleKeyPress}
      />

      <Input
        label="비밀번호 (숫자 6자리)"
        type="password"
        value={password}
        onChange={handlePasswordChange}
        placeholder="000000"
        maxLength={6}
        required
        onKeyPress={handleKeyPress}
      />

      {/* 비밀번호 재설정 안내 */}
      <div className="info-box" style={{ fontSize: '13px', padding: '12px' }}>
        💡 비밀번호를 잊으셨나요?{' '}
        <Link
          to="/reservation/password-reset"
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
