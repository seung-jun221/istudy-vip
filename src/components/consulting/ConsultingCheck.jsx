import { useState } from 'react';
import Input from '../common/Input';
import Button from '../common/Button';
import { validatePhone } from '../../utils/format';
import { useConsulting } from '../../context/ConsultingContext';
import { supabase, hashPassword } from '../../utils/supabase';

export default function ConsultingCheck({ onBack, onResult }) {
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

    if (password.length !== 6) {
      showToast('비밀번호는 6자리 숫자여야 합니다.', 'error');
      return;
    }

    setLoading(true);

    try {
      // 예약 조회
      const { data: reservations, error } = await supabase
        .from('consulting_reservations')
        .select('*, consulting_slots(*)')
        .eq('parent_phone', phone)
        .in('status', ['confirmed', 'pending'])
        .order('created_at', { ascending: false });

      if (error) throw error;

      if (!reservations || reservations.length === 0) {
        showToast('예약 정보를 찾을 수 없습니다.', 'error');
        setLoading(false);
        return;
      }

      // 가장 최근 예약
      const latestReservation = reservations[0];

      // ⭐ 비밀번호 검증
      if (latestReservation.password !== hashPassword(password)) {
        showToast('비밀번호가 일치하지 않습니다.', 'error');
        setLoading(false);
        return;
      }

      if (reservations.length > 1) {
        showToast(
          `${reservations.length}개의 예약이 있습니다. 가장 최근 예약을 표시합니다.`,
          'info'
        );
      }

      setLoading(false);
      onResult(latestReservation);
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
        label="비밀번호 (숫자 6자리)"
        type="password"
        value={password}
        onChange={(e) =>
          setPassword(e.target.value.replace(/[^0-9]/g, '').slice(0, 6))
        }
        placeholder="000000"
        maxLength={6}
        required
        onKeyPress={handleKeyPress}
      />

      <div className="flex gap-3">
        <Button type="button" variant="secondary" onClick={onBack}>
          ← 뒤로
        </Button>
        <Button onClick={handleSubmit}>예약 확인하기</Button>
      </div>
    </div>
  );
}
