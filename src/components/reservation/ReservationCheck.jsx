import { useState, useEffect } from 'react';
import Input from '../common/Input';
import Button from '../common/Button';
import {
  validatePhone,
  formatDate,
  formatTime,
  formatPhone,
} from '../../utils/format';
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

  // prefilledPhone이 있으면 자동 입력
  useEffect(() => {
    if (prefilledPhone) {
      setPhone(prefilledPhone);
      // 비밀번호 입력란에 포커스
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

  const handleSubmit = async (e) => {
    e.preventDefault();

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
      // 예약 조회
      const { data: reservations, error } = await supabase
        .from('reservations')
        .select('*')
        .eq('parent_phone', phone)
        .eq('password', hashPassword(password))
        .in('status', ['예약', '대기'])
        .order('registered_at', { ascending: false })
        .limit(1);

      if (error || !reservations || reservations.length === 0) {
        showToast(
          '예약을 찾을 수 없거나 비밀번호가 일치하지 않습니다.',
          'error'
        );
        return;
      }

      const reservation = reservations[0];

      // 설명회 정보 가져오기
      const { data: seminar, error: seminarError } = await supabase
        .from('seminars')
        .select('*')
        .eq('id', reservation.seminar_id)
        .single();

      if (seminarError) throw seminarError;

      // 결과 전달
      onResult({ ...reservation, seminar });
    } catch (error) {
      console.error('예약 조회 실패:', error);
      showToast('예약 조회 중 오류가 발생했습니다.', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* 전화번호 자동 입력 안내 */}
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
      />

      <Input
        label="비밀번호 (숫자 6자리)"
        type="password"
        value={password}
        onChange={handlePasswordChange}
        placeholder="000000"
        maxLength={6}
        required
      />

      <div className="flex gap-3">
        <Button type="button" variant="secondary" onClick={onBack}>
          ← 뒤로
        </Button>
        <Button type="submit">예약 확인하기</Button>
      </div>
    </form>
  );
}
