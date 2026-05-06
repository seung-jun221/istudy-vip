import { useState, useEffect, useMemo } from 'react';
import { supabase } from '../../utils/supabase';
import { formatPhone } from '../../utils/format';
import * as XLSX from 'xlsx';
import './AdminTabs.css';

export default function TargetExtractTab({ campaignId, onPhoneClick }) {
  // 데이터
  const [allReservations, setAllReservations] = useState([]);
  const [excludedPhones, setExcludedPhones] = useState(new Set());
  const [testNoShowPhones, setTestNoShowPhones] = useState(new Set());
  const [cancelledConsultingPhones, setCancelledConsultingPhones] = useState(new Set());
  const [campaigns, setCampaigns] = useState([]);
  const [loading, setLoading] = useState(false);

  // 필터
  const [selectedCampaignId, setSelectedCampaignId] = useState('all');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [selectedGrades, setSelectedGrades] = useState([]);
  const [excludeTestNoShow, setExcludeTestNoShow] = useState(false);
  const [excludeCancelledConsulting, setExcludeCancelledConsulting] = useState(false);

  // 통계
  const [statsBreakdown, setStatsBreakdown] = useState(null);

  const grades = ['초1','초2','초3','초4','초5','초6','중1','중2','중3','고1','고2','고3'];

  useEffect(() => {
    const twelveMonthsAgo = new Date();
    twelveMonthsAgo.setMonth(twelveMonthsAgo.getMonth() - 12);
    setDateFrom(twelveMonthsAgo.toISOString().split('T')[0]);
    setDateTo(new Date().toISOString().split('T')[0]);
    loadCampaigns();
  }, []);

  useEffect(() => {
    if (dateFrom && dateTo) {
      loadData();
    }
  }, [dateFrom, dateTo]);

  const loadCampaigns = async () => {
    const { data } = await supabase
      .from('campaigns')
      .select('id, title, location, status')
      .order('created_at', { ascending: false });
    setCampaigns(data || []);
  };

  const loadData = async () => {
    setLoading(true);
    try {
      // 1) 설명회 접점자 (privacy_consent='Y' 필수)
      let reservationQuery = supabase
        .from('reservations')
        .select('parent_phone, student_name, grade, school, math_level, status, registered_at, campaign_id, seminar_slots(date, time, location, campaign_id)')
        .in('status', ['예약', '참석', '대기'])
        .eq('privacy_consent', 'Y');

      const { data: reservations, error: resError } = await reservationQuery;
      if (resError) throw resError;

      // 날짜 필터 (seminar_slots.date 기준 또는 registered_at 기준)
      const filtered = (reservations || []).filter(r => {
        const slotDate = r.seminar_slots?.date;
        const date = slotDate || r.registered_at?.split('T')[0];
        if (!date) return true;
        return date >= dateFrom && date <= dateTo;
      });

      setAllReservations(filtered);

      // 2) 제외 대상: 컨설팅 활성 예약자 (전체 캠페인 범위, parent_phone 기준)
      const { data: activeConsultings } = await supabase
        .from('consulting_reservations')
        .select('parent_phone')
        .not('status', 'in', '(cancelled,auto_cancelled,취소)');

      const consultingPhoneSet = new Set(
        (activeConsultings || []).map(c => formatPhone(c.parent_phone)).filter(Boolean)
      );

      // 3) 제외 대상: 진단검사 실제 응시자 (auto/manual, 전체 범위)
      const { data: testSubmissions } = await supabase
        .from('diagnostic_submissions')
        .select('parent_phone')
        .in('submission_type', ['auto', 'manual']);

      const testPhoneSet = new Set(
        (testSubmissions || []).map(t => formatPhone(t.parent_phone)).filter(Boolean)
      );

      // 통합 제외 Set
      const excluded = new Set([...consultingPhoneSet, ...testPhoneSet]);
      setExcludedPhones(excluded);

      // 4) 진단검사 노쇼 (예약만 하고 미응시) — 토글 필터용
      const { data: testReservations } = await supabase
        .from('test_reservations')
        .select('parent_phone')
        .in('status', ['confirmed', '예약']);

      const testResPhones = new Set(
        (testReservations || []).map(t => formatPhone(t.parent_phone)).filter(Boolean)
      );
      // 노쇼 = 예약은 있지만 응시(diagnostic_submissions)는 안 한 전화번호
      const noShowPhones = new Set(
        [...testResPhones].filter(p => !testPhoneSet.has(p))
      );
      setTestNoShowPhones(noShowPhones);

      // 5) 컨설팅 취소자 — 토글 필터용
      const { data: cancelledConsultings } = await supabase
        .from('consulting_reservations')
        .select('parent_phone')
        .in('status', ['cancelled', 'auto_cancelled', '취소']);

      const cancelledPhones = new Set(
        (cancelledConsultings || []).map(c => formatPhone(c.parent_phone)).filter(Boolean)
      );
      // 취소자 중 활성 컨설팅이 있는 경우는 이미 제외 대상이므로
      // 여기서는 순수 취소만 한 학부모 (제외 대상에 없는 취소자)
      setCancelledConsultingPhones(cancelledPhones);

      // 통계
      setStatsBreakdown({
        total: filtered.length,
        consultingExcluded: consultingPhoneSet.size,
        testExcluded: testPhoneSet.size,
        totalExcluded: excluded.size,
      });

    } catch (error) {
      console.error('타겟 데이터 로드 실패:', error);
    } finally {
      setLoading(false);
    }
  };

  // 전화번호별 학생 그룹핑 + 필터 적용
  const targetList = useMemo(() => {
    // 캠페인 필터
    let filtered = allReservations;
    if (selectedCampaignId !== 'all') {
      filtered = filtered.filter(r => r.campaign_id === selectedCampaignId);
    }

    // 전화번호 기준 그룹핑
    const phoneMap = new Map();
    filtered.forEach(r => {
      const phone = formatPhone(r.parent_phone);
      if (!phone) return;

      // 기본 제외 (컨설팅 활성 + 진단검사 응시자)
      if (excludedPhones.has(phone)) return;

      // 토글: 진단검사 노쇼 제외
      if (excludeTestNoShow && testNoShowPhones.has(phone)) return;

      // 토글: 컨설팅 취소자 제외
      if (excludeCancelledConsulting && cancelledConsultingPhones.has(phone)) return;

      if (!phoneMap.has(phone)) {
        phoneMap.set(phone, {
          phone,
          studentName: r.student_name || '',
          grade: r.grade || '',
          school: r.school || '',
          mathLevel: r.math_level || '',
          lastContactDate: r.seminar_slots?.date || r.registered_at?.split('T')[0] || '',
          lastContactType: r.status,
          campaignIds: new Set(),
        });
      }

      const entry = phoneMap.get(phone);
      // 최신 정보로 업데이트
      const currentDate = r.seminar_slots?.date || r.registered_at?.split('T')[0] || '';
      if (currentDate > entry.lastContactDate) {
        entry.lastContactDate = currentDate;
        entry.lastContactType = r.status;
        entry.studentName = r.student_name || entry.studentName;
        entry.grade = r.grade || entry.grade;
        entry.school = r.school || entry.school;
        entry.mathLevel = r.math_level || entry.mathLevel;
      }
      if (r.campaign_id) entry.campaignIds.add(r.campaign_id);
    });

    let result = [...phoneMap.values()].map(e => ({
      ...e,
      campaignCount: e.campaignIds.size,
    }));

    // 학년 필터
    if (selectedGrades.length > 0) {
      result = result.filter(r => selectedGrades.includes(r.grade));
    }

    // 최신 접점일 순 정렬
    result.sort((a, b) => b.lastContactDate.localeCompare(a.lastContactDate));

    return result;
  }, [allReservations, excludedPhones, testNoShowPhones, cancelledConsultingPhones,
      selectedCampaignId, selectedGrades, excludeTestNoShow, excludeCancelledConsulting]);

  const handleExportExcel = () => {
    if (targetList.length === 0) {
      alert('추출된 데이터가 없습니다.');
      return;
    }

    const contactTypeLabel = { '예약': '예약', '참석': '참석', '대기': '대기' };

    const excelData = targetList.map(t => ({
      학생명: t.studentName,
      '학부모 전화번호': t.phone,
      학년: t.grade,
      학교: t.school,
      선행정도: t.mathLevel,
      '마지막 접점일': t.lastContactDate,
      '접점 종류': contactTypeLabel[t.lastContactType] || t.lastContactType,
      '참여 캠페인 수': t.campaignCount,
    }));

    const worksheet = XLSX.utils.json_to_sheet(excelData);
    worksheet['!cols'] = [
      { wch: 12 }, { wch: 16 }, { wch: 8 }, { wch: 20 },
      { wch: 15 }, { wch: 14 }, { wch: 10 }, { wch: 14 },
    ];

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, '타겟_명단');

    const today = new Date();
    const dateStr = `${today.getFullYear()}${String(today.getMonth() + 1).padStart(2, '0')}${String(today.getDate()).padStart(2, '0')}`;
    XLSX.writeFile(workbook, `입학안내_타겟_${dateStr}.xlsx`);
  };

  const toggleGrade = (grade) => {
    setSelectedGrades(prev =>
      prev.includes(grade) ? prev.filter(g => g !== grade) : [...prev, grade]
    );
  };

  const formatDateDisplay = (dateStr) => {
    if (!dateStr) return '-';
    const d = new Date(dateStr);
    return `${d.getMonth() + 1}/${d.getDate()}`;
  };

  return (
    <div>
      {/* 필터 영역 */}
      <div style={{
        background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '8px',
        padding: '20px', marginBottom: '20px',
      }}>
        <h3 style={{ margin: '0 0 16px', fontSize: '15px', fontWeight: 600, color: '#1e293b' }}>
          추출 조건
        </h3>

        {/* 1행: 캠페인 + 기간 */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px', marginBottom: '16px' }}>
          <div>
            <label style={{ fontSize: '12px', color: '#64748b', display: 'block', marginBottom: '4px' }}>
              캠페인 선택
            </label>
            <select
              value={selectedCampaignId}
              onChange={(e) => setSelectedCampaignId(e.target.value)}
              style={{
                width: '100%', padding: '8px 10px', border: '1px solid #d1d5db',
                borderRadius: '6px', fontSize: '13px', boxSizing: 'border-box',
              }}
            >
              <option value="all">전체 통합</option>
              {campaigns.map(c => (
                <option key={c.id} value={c.id}>
                  {c.title} ({c.location})
                </option>
              ))}
            </select>
          </div>
          <div>
            <label style={{ fontSize: '12px', color: '#64748b', display: 'block', marginBottom: '4px' }}>
              접점일 시작
            </label>
            <input
              type="date" value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              style={{
                width: '100%', padding: '8px 10px', border: '1px solid #d1d5db',
                borderRadius: '6px', fontSize: '13px', boxSizing: 'border-box',
              }}
            />
          </div>
          <div>
            <label style={{ fontSize: '12px', color: '#64748b', display: 'block', marginBottom: '4px' }}>
              접점일 종료
            </label>
            <input
              type="date" value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              style={{
                width: '100%', padding: '8px 10px', border: '1px solid #d1d5db',
                borderRadius: '6px', fontSize: '13px', boxSizing: 'border-box',
              }}
            />
          </div>
        </div>

        {/* 2행: 학년 멀티셀렉트 */}
        <div style={{ marginBottom: '16px' }}>
          <label style={{ fontSize: '12px', color: '#64748b', display: 'block', marginBottom: '6px' }}>
            자녀 학년 (미선택 시 전체)
          </label>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
            {grades.map(g => (
              <button
                key={g}
                onClick={() => toggleGrade(g)}
                style={{
                  padding: '4px 10px', borderRadius: '4px', fontSize: '12px', cursor: 'pointer',
                  border: selectedGrades.includes(g) ? '2px solid #3b82f6' : '1px solid #d1d5db',
                  background: selectedGrades.includes(g) ? '#dbeafe' : 'white',
                  color: selectedGrades.includes(g) ? '#1d4ed8' : '#6b7280',
                  fontWeight: selectedGrades.includes(g) ? 600 : 400,
                }}
              >
                {g}
              </button>
            ))}
            {selectedGrades.length > 0 && (
              <button
                onClick={() => setSelectedGrades([])}
                style={{
                  padding: '4px 10px', borderRadius: '4px', fontSize: '12px',
                  border: '1px solid #fecaca', background: '#fef2f2', color: '#dc2626',
                  cursor: 'pointer',
                }}
              >
                초기화
              </button>
            )}
          </div>
        </div>

        {/* 3행: 토글 */}
        <div style={{ display: 'flex', gap: '24px' }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', cursor: 'pointer' }}>
            <input
              type="checkbox" checked={excludeTestNoShow}
              onChange={(e) => setExcludeTestNoShow(e.target.checked)}
              style={{ width: '16px', height: '16px' }}
            />
            <span>진단검사 노쇼 제외</span>
            <span style={{ fontSize: '11px', color: '#94a3b8' }}>
              (예약만 하고 미응시한 학부모 제외)
            </span>
          </label>
          <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', cursor: 'pointer' }}>
            <input
              type="checkbox" checked={excludeCancelledConsulting}
              onChange={(e) => setExcludeCancelledConsulting(e.target.checked)}
              style={{ width: '16px', height: '16px' }}
            />
            <span>컨설팅 취소자 제외</span>
            <span style={{ fontSize: '11px', color: '#94a3b8' }}>
              (컨설팅 예약 후 취소한 학부모 제외)
            </span>
          </label>
        </div>
      </div>

      {/* 통계 요약 */}
      <div style={{
        display: 'flex', gap: '12px', marginBottom: '20px', flexWrap: 'wrap',
      }}>
        <div style={{
          padding: '12px 20px', background: '#eff6ff', border: '1px solid #bfdbfe',
          borderRadius: '8px', textAlign: 'center', flex: '1 1 120px',
        }}>
          <div style={{ fontSize: '24px', fontWeight: 700, color: '#1d4ed8' }}>
            {loading ? '...' : targetList.length}
          </div>
          <div style={{ fontSize: '12px', color: '#64748b' }}>추출된 타겟</div>
        </div>
        {statsBreakdown && (
          <>
            <div style={{
              padding: '12px 20px', background: '#f0fdf4', border: '1px solid #bbf7d0',
              borderRadius: '8px', textAlign: 'center', flex: '1 1 120px',
            }}>
              <div style={{ fontSize: '24px', fontWeight: 700, color: '#16a34a' }}>
                {statsBreakdown.total}
              </div>
              <div style={{ fontSize: '12px', color: '#64748b' }}>설명회 접점자 (전체)</div>
            </div>
            <div style={{
              padding: '12px 20px', background: '#fef2f2', border: '1px solid #fecaca',
              borderRadius: '8px', textAlign: 'center', flex: '1 1 120px',
            }}>
              <div style={{ fontSize: '24px', fontWeight: 700, color: '#dc2626' }}>
                {statsBreakdown.totalExcluded}
              </div>
              <div style={{ fontSize: '12px', color: '#64748b' }}>제외 (컨설팅+진단)</div>
            </div>
          </>
        )}
      </div>

      {/* 액션 버튼 */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
        <div style={{ fontSize: '14px', color: '#4b5563' }}>
          {loading
            ? '데이터 로드 중...'
            : `${targetList.length}명의 학부모가 추출되었습니다.`
          }
        </div>
        <button
          onClick={handleExportExcel}
          disabled={targetList.length === 0 || loading}
          style={{
            padding: '10px 20px', borderRadius: '6px', border: 'none',
            background: targetList.length === 0 || loading ? '#d1d5db' : '#f59e0b',
            color: 'white', fontWeight: 600, fontSize: '14px',
            cursor: targetList.length === 0 || loading ? 'not-allowed' : 'pointer',
          }}
        >
          엑셀 다운로드
        </button>
      </div>

      {/* 미리보기 테이블 */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '40px', color: '#94a3b8' }}>
          데이터를 불러오는 중입니다...
        </div>
      ) : targetList.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '40px', color: '#94a3b8' }}>
          조건에 맞는 타겟이 없습니다.
        </div>
      ) : (
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
            <thead>
              <tr style={{ background: '#f8fafc', borderBottom: '2px solid #e2e8f0' }}>
                <th style={{ padding: '10px 12px', textAlign: 'left', fontWeight: 600, color: '#475569' }}>학생명</th>
                <th style={{ padding: '10px 12px', textAlign: 'left', fontWeight: 600, color: '#475569' }}>학부모 전화번호</th>
                <th style={{ padding: '10px 12px', textAlign: 'left', fontWeight: 600, color: '#475569' }}>학년</th>
                <th style={{ padding: '10px 12px', textAlign: 'left', fontWeight: 600, color: '#475569' }}>학교</th>
                <th style={{ padding: '10px 12px', textAlign: 'left', fontWeight: 600, color: '#475569' }}>마지막 접점일</th>
                <th style={{ padding: '10px 12px', textAlign: 'left', fontWeight: 600, color: '#475569' }}>접점 종류</th>
                <th style={{ padding: '10px 12px', textAlign: 'center', fontWeight: 600, color: '#475569' }}>캠페인 수</th>
              </tr>
            </thead>
            <tbody>
              {targetList.slice(0, 200).map((t, idx) => (
                <tr key={t.phone + idx} style={{ borderBottom: '1px solid #f1f5f9' }}>
                  <td style={{ padding: '10px 12px' }}>{t.studentName}</td>
                  <td style={{ padding: '10px 12px' }}>
                    <span
                      onClick={() => onPhoneClick?.(t.phone)}
                      style={{
                        color: '#2563eb', cursor: onPhoneClick ? 'pointer' : 'default',
                        textDecoration: onPhoneClick ? 'underline' : 'none',
                      }}
                    >
                      {t.phone}
                    </span>
                  </td>
                  <td style={{ padding: '10px 12px' }}>{t.grade}</td>
                  <td style={{ padding: '10px 12px' }}>{t.school}</td>
                  <td style={{ padding: '10px 12px' }}>{formatDateDisplay(t.lastContactDate)}</td>
                  <td style={{ padding: '10px 12px' }}>
                    <span style={{
                      padding: '2px 8px', borderRadius: '4px', fontSize: '12px',
                      background: t.lastContactType === '참석' ? '#dcfce7' : t.lastContactType === '예약' ? '#dbeafe' : '#fef3c7',
                      color: t.lastContactType === '참석' ? '#16a34a' : t.lastContactType === '예약' ? '#2563eb' : '#d97706',
                    }}>
                      {t.lastContactType}
                    </span>
                  </td>
                  <td style={{ padding: '10px 12px', textAlign: 'center' }}>{t.campaignCount}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {targetList.length > 200 && (
            <div style={{
              textAlign: 'center', padding: '12px', color: '#94a3b8', fontSize: '13px',
              borderTop: '1px solid #e2e8f0',
            }}>
              상위 200명만 미리보기로 표시됩니다. 전체 {targetList.length}명은 엑셀 다운로드를 이용해주세요.
            </div>
          )}
        </div>
      )}
    </div>
  );
}
