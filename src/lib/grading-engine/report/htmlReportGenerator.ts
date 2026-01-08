/**
 * HTML 보고서 생성기
 *
 * 채점 결과를 7페이지 HTML 보고서로 변환합니다.
 */

import { GradingResult, TestType, AreaType, ReportData } from '../types';
import { generateReportData } from './commentGenerator';
import {
  generateLearningStrategies,
  createStudentProfile,
  StrategyComment,
  ProgressLevel,
} from './learningStrategyDatabase';
import { getTScoreLevel, PerformanceLevel } from './levelMapper';

// ============== 유틸리티 함수 ==============

/**
 * T-Score에 따른 CSS 클래스 반환
 */
function getTScoreClass(tScore: number): string {
  if (tScore >= 70) return 'excellent';
  if (tScore >= 60) return 'good';
  if (tScore < 40) return 'weak';
  return '';
}

/**
 * T-Score에 따른 색상 반환
 */
function getTScoreColor(tScore: number): string {
  if (tScore >= 70) return '#27AE60';
  if (tScore >= 60) return '#3498DB';
  if (tScore < 40) return '#E74C3C';
  return '#2C3E50';
}

/**
 * T-Score에 따른 평가 텍스트 반환
 */
function getTScoreEvaluation(tScore: number): string {
  if (tScore >= 70) return '최상';
  if (tScore >= 60) return '우수';
  if (tScore >= 50) return '보통';
  if (tScore >= 40) return '주의';
  return '위험';
}

/**
 * 정답률에 따른 색상 반환
 */
function getAccuracyColor(accuracy: number): string {
  if (accuracy >= 90) return '#27AE60';
  if (accuracy >= 70) return '#3498DB';
  if (accuracy >= 50) return '#F39C12';
  return '#E74C3C';
}

/**
 * 시험 타입에 따른 한글 이름 반환
 */
function getTestTypeName(testType: TestType): string {
  const names: Record<TestType, string> = {
    MONO: 'MONO 진단검사',
    DI: 'DI 진단검사',
    TRI: 'TRI 진단검사',
  };
  return names[testType];
}

/**
 * 영역별 영어 이름 반환
 */
function getAreaEnglishName(area: AreaType): string {
  const names: Record<AreaType, string> = {
    // MONO
    '수와 연산': 'Numbers and Operations',
    '식의 계산': 'Algebraic Operations',
    '방정식': 'Equations',
    '함수': 'Functions',
    // DI
    '유리수와 순환소수': 'Rational Numbers and Repeating Decimals',
    '단항식과 다항식의 계산': 'Monomial and Polynomial Operations',
    '일차부등식': 'Linear Inequalities',
    '연립방정식': 'System of Equations',
    '일차함수': 'Linear Functions',
    // TRI
    '실수와 연산': 'Real Numbers and Operations',
    '다항식': 'Polynomials',
    '이차방정식': 'Quadratic Equations',
    '이차함수': 'Quadratic Functions',
  };
  return names[area] || area;
}

/**
 * 원 형태 숫자 변환
 */
function getCircledNumber(num: number): string {
  const circled = ['①', '②', '③', '④', '⑤', '⑥', '⑦', '⑧', '⑨', '⑩',
    '⑪', '⑫', '⑬', '⑭', '⑮', '⑯', '⑰', '⑱', '⑲', '⑳',
    '㉑', '㉒', '㉓', '㉔', '㉕'];
  return circled[num - 1] || `(${num})`;
}

// ============== HTML 생성 함수 ==============

/**
 * CSS 스타일 생성
 */
function generateStyles(): string {
  return `
    <style>
        @import url('https://fonts.googleapis.com/css2?family=Noto+Sans+KR:wght@300;400;500;600;700;800&display=swap');

        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }

        body {
            font-family: 'Noto Sans KR', sans-serif;
            background: #f5f5f5;
            color: #333;
        }

        .page {
            width: 210mm;
            min-height: 297mm;
            background: white;
            margin: 0 auto 20px;
            padding: 12mm 20mm 15mm 20mm;
            page-break-after: always;
            position: relative;
        }

        .report-header {
            border-bottom: 3px solid #2C3E50;
            padding-bottom: 12px;
            margin-bottom: 15px;
        }

        .report-title {
            font-size: 24px;
            font-weight: 800;
            color: #2C3E50;
            margin-bottom: 5px;
        }

        .report-subtitle {
            font-size: 13px;
            color: #7F8C8D;
            font-weight: 500;
        }

        .section-title {
            font-size: 18px;
            font-weight: 700;
            color: #2C3E50;
            margin: 15px 0 10px 0;
            padding-left: 12px;
            border-left: 4px solid #3498DB;
        }

        .info-table {
            width: 100%;
            border-collapse: collapse;
            margin: 10px 0;
            font-size: 13px;
        }

        .info-table th {
            background: #ECF0F1;
            padding: 10px;
            text-align: left;
            font-weight: 600;
            color: #2C3E50;
            border: 1px solid #BDC3C7;
        }

        .info-table td {
            padding: 10px;
            border: 1px solid #BDC3C7;
        }

        .overview-grid {
            display: grid;
            grid-template-columns: repeat(4, 1fr);
            gap: 8px;
            margin: 12px 0;
        }

        .score-card {
            padding: 15px 10px;
            border-radius: 10px;
            text-align: center;
            min-height: 90px;
            display: flex;
            flex-direction: column;
            justify-content: center;
        }

        .score-card.primary {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
        }

        .score-card.secondary {
            background: white;
            border: 2px solid #3498DB;
            color: #2C3E50;
        }

        .score-label {
            font-size: 11px;
            opacity: 0.9;
            margin-bottom: 5px;
            font-weight: 600;
        }

        .score-value {
            font-size: 32px;
            font-weight: 800;
            line-height: 1;
            margin-bottom: 3px;
        }

        .score-unit {
            font-size: 14px;
            font-weight: 600;
            opacity: 0.9;
        }

        .score-subtext {
            font-size: 10px;
            opacity: 0.8;
            margin-top: 2px;
        }

        .distribution-section {
            margin: 12px 0;
            background: #FAFAFA;
            padding: 12px;
            border-radius: 8px;
        }

        .distribution-title {
            font-size: 13px;
            font-weight: 700;
            color: #2C3E50;
            margin-bottom: 10px;
            text-align: center;
        }

        .distribution-canvas-wrapper {
            position: relative;
            height: 140px;
            margin: 0 auto;
        }

        #distributionCanvas {
            width: 100%;
            height: 100%;
            display: block;
        }

        .profile-chart {
            margin: 12px 0;
            background: #FAFAFA;
            padding: 12px;
            border-radius: 8px;
        }

        .chart-header {
            display: flex;
            justify-content: space-between;
            margin-bottom: 10px;
            font-size: 10px;
            color: #7F8C8D;
            font-weight: 600;
        }

        .chart-scale {
            display: flex;
            justify-content: space-between;
            margin-bottom: 8px;
            padding: 0 50px;
            font-size: 9px;
            color: #95A5A6;
        }

        .chart-row {
            display: flex;
            align-items: center;
            margin-bottom: 8px;
            position: relative;
        }

        .chart-label {
            width: 100px;
            font-size: 12px;
            font-weight: 600;
            color: #2C3E50;
        }

        .chart-bar-container {
            flex: 1;
            height: 26px;
            background: white;
            border: 1px solid #E0E0E0;
            border-radius: 4px;
            position: relative;
            overflow: visible;
        }

        .chart-bar-container::before {
            content: '';
            position: absolute;
            left: 20%;
            right: 20%;
            top: 0;
            bottom: 0;
            background: #E8F5E9;
            z-index: 0;
        }

        .chart-bar {
            position: absolute;
            left: 0;
            top: 0;
            bottom: 0;
            background: linear-gradient(90deg, #E74C3C 0%, #C0392B 100%);
            border-radius: 3px;
            display: flex;
            align-items: center;
            justify-content: flex-end;
            padding-right: 8px;
            z-index: 1;
        }

        .chart-bar.good {
            background: linear-gradient(90deg, #3498DB 0%, #2980B9 100%);
        }

        .chart-bar.excellent {
            background: linear-gradient(90deg, #27AE60 0%, #229954 100%);
        }

        .chart-value {
            font-size: 11px;
            font-weight: 700;
            color: white;
        }

        .t-score-table {
            margin: 10px 0;
            font-size: 11px;
        }

        .t-score-table th {
            background: #34495E;
            color: white;
            padding: 8px;
            font-weight: 600;
        }

        .t-score-table td {
            padding: 6px;
            text-align: center;
        }

        .t-score-table td.excellent {
            background: #D5F4E6;
            font-weight: 700;
            color: #27AE60;
        }

        .t-score-table td.good {
            background: #D6EAF8;
            font-weight: 700;
            color: #2980B9;
        }

        .t-score-table td.weak {
            background: #FADBD8;
            font-weight: 700;
            color: #C0392B;
        }

        .school-comp-grid {
            display: grid;
            grid-template-columns: repeat(2, 1fr);
            gap: 12px;
            margin: 15px 0;
        }

        .school-comp-box {
            background: white;
            border: 1px solid #E8E8E8;
            padding: 16px;
            border-radius: 8px;
        }

        .school-comp-type {
            font-size: 12px;
            color: #95A5A6;
            font-weight: 500;
            margin-bottom: 10px;
        }

        .school-comp-badges {
            display: flex;
            gap: 8px;
            align-items: center;
            margin-bottom: 12px;
            flex-wrap: wrap;
        }

        .badge-percentile {
            background: linear-gradient(135deg, #FFF5F5 0%, #FFE8E8 100%);
            color: #E74C3C;
            padding: 6px 12px;
            border-radius: 6px;
            font-size: 13px;
            font-weight: 700;
            border: 1px solid #FFCDD2;
        }

        .badge-grade {
            background: linear-gradient(135deg, #E3F2FD 0%, #BBDEFB 100%);
            color: #2196F3;
            padding: 6px 12px;
            border-radius: 6px;
            font-size: 13px;
            font-weight: 700;
            border: 1px solid #90CAF9;
        }

        .badge-diff {
            background: #F5F5F5;
            color: #757575;
            padding: 6px 10px;
            border-radius: 6px;
            font-size: 11px;
            font-weight: 600;
            margin-left: auto;
        }

        .school-comp-bar {
            height: 6px;
            background: #F5F5F5;
            border-radius: 3px;
            overflow: hidden;
            margin-bottom: 8px;
        }

        .school-comp-fill {
            height: 100%;
            background: linear-gradient(90deg, #3498DB 0%, #5DADE2 100%);
            border-radius: 3px;
        }

        .school-comp-footer {
            font-size: 10px;
            color: #B0B0B0;
            text-align: right;
        }

        .area-detail-card {
            background: #FAFAFA;
            border-radius: 6px;
            padding: 15px;
            margin-bottom: 15px;
            border-left: 4px solid #3498DB;
            page-break-inside: avoid;
        }

        .area-detail-card.weak {
            border-left-color: #E74C3C;
        }

        .area-detail-card.excellent {
            border-left-color: #27AE60;
        }

        .area-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 12px;
        }

        .area-name {
            font-size: 15px;
            font-weight: 700;
            color: #2C3E50;
        }

        .area-stats {
            display: flex;
            gap: 15px;
            align-items: center;
        }

        .stat-item {
            text-align: center;
        }

        .stat-label {
            font-size: 10px;
            color: #7F8C8D;
            margin-bottom: 3px;
        }

        .stat-value {
            font-size: 16px;
            font-weight: 800;
            color: #2C3E50;
        }

        .distribution-container {
            margin: 10px 0;
        }

        .distribution-curve {
            height: 30px;
            background: linear-gradient(to right, #FADBD8, #FCF3CF, #D5F4E6);
            border-radius: 15px;
            position: relative;
            margin-bottom: 5px;
        }

        .distribution-marker {
            position: absolute;
            top: -8px;
            transform: translateX(-50%);
        }

        .distribution-label {
            background: #E74C3C;
            color: white;
            padding: 3px 8px;
            border-radius: 10px;
            font-size: 10px;
            font-weight: 700;
            white-space: nowrap;
        }

        .distribution-scale {
            display: flex;
            justify-content: space-between;
            font-size: 9px;
            color: #95A5A6;
            padding: 0 10px;
        }

        .ment-box {
            background: #FAFAFA;
            border-left: 4px solid #3498DB;
            padding: 15px;
            border-radius: 6px;
            margin-bottom: 15px;
            page-break-inside: avoid;
        }

        .ment-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 8px;
        }

        .ment-category {
            background: #3498DB;
            color: white;
            padding: 3px 10px;
            border-radius: 10px;
            font-size: 10px;
            font-weight: 600;
        }

        .ment-number {
            font-size: 10px;
            color: #95A5A6;
        }

        .ment-title {
            font-size: 14px;
            color: #2C3E50;
            font-weight: 700;
            margin-bottom: 8px;
        }

        .ment-content {
            font-size: 12px;
            color: #555;
            line-height: 1.7;
            margin-bottom: 8px;
        }

        .ment-summary {
            background: white;
            padding: 10px;
            border-radius: 4px;
            font-size: 11px;
            color: #3498DB;
            border: 1px solid #E9ECEF;
        }

        .page-number {
            position: absolute;
            bottom: 10mm;
            right: 20mm;
            font-size: 11px;
            color: #95A5A6;
        }

        @media print {
            body {
                background: white;
            }

            .page {
                margin: 0;
                box-shadow: none;
                page-break-after: always;
            }

            .page:last-child {
                page-break-after: auto;
            }

            * {
                -webkit-print-color-adjust: exact !important;
                print-color-adjust: exact !important;
                color-adjust: exact !important;
            }
        }

        @page {
            size: A4;
            margin: 0;
        }
    </style>`;
}

/**
 * Page 1: 종합 결과 생성
 */
function generatePage1(result: GradingResult, reportData: ReportData): string {
  const { studentInfo, overallScore, areaResults, statistics } = result;

  // 5등급제 환산 설명
  const grade5Description = overallScore.grade5 === 1 ? '상위 10%' :
    overallScore.grade5 === 2 ? '상위 10~30%' :
    overallScore.grade5 === 3 ? '상위 30~60%' :
    overallScore.grade5 === 4 ? '상위 60~90%' : '상위 90~100%';

  // 9등급 범위 설명
  const grade9Range = getGrade9Range(overallScore.grade9, statistics);

  // T-Score 차트 행 생성
  const chartRows = areaResults.map(ar => `
            <div class="chart-row">
                <div class="chart-label">${ar.area}</div>
                <div class="chart-bar-container">
                    <div class="chart-bar ${getTScoreClass(ar.tScore)}" style="width: ${Math.min(ar.tScore, 100)}%;">
                        <span class="chart-value">${ar.tScore.toFixed(1)}</span>
                    </div>
                </div>
            </div>`).join('\n');

  // T-Score 테이블 행 생성
  const tableRows = areaResults.map(ar => `
            <tr>
                <td><strong>${ar.area}</strong></td>
                <td>${ar.earnedScore}/${ar.totalScore}</td>
                <td class="${getTScoreClass(ar.tScore)}">${ar.tScore.toFixed(1)}</td>
                <td>${ar.percentile.toFixed(0)}%</td>
                <td class="${getTScoreClass(ar.tScore)}">${getTScoreEvaluation(ar.tScore)}</td>
            </tr>`).join('\n');

  return `
    <!-- Page 1: 종합 결과 -->
    <div class="page">
        <div class="report-header">
            <div class="report-title">i.study 수리탐구 진단검사 결과 보고서</div>
            <div class="report-subtitle">${getTestTypeName(studentInfo.testType)} | ${studentInfo.grade} ${studentInfo.studentName}</div>
        </div>

        <div class="section-title">01. 종합 성적 및 등급</div>

        <div class="overview-grid">
            <div class="score-card primary">
                <div class="score-label">원점수</div>
                <div class="score-value">${overallScore.earnedScore}<span class="score-unit">점</span></div>
                <div class="score-subtext">${overallScore.totalScore}점 만점 / 25문항</div>
            </div>
            <div class="score-card secondary">
                <div class="score-label">전국 백분위</div>
                <div class="score-value"><span class="score-unit">상위</span> ${(100 - overallScore.percentile).toFixed(1)}<span class="score-unit">%</span></div>
                <div class="score-subtext">${overallScore.percentile.toFixed(1)} percentile</div>
            </div>
            <div class="score-card secondary">
                <div class="score-label">9등급제 환산</div>
                <div class="score-value">${overallScore.grade9}<span class="score-unit">등급</span></div>
                <div class="score-subtext">${grade9Range}</div>
            </div>
            <div class="score-card secondary">
                <div class="score-label">5등급제 환산</div>
                <div class="score-value">${overallScore.grade5}<span class="score-unit">등급</span></div>
                <div class="score-subtext">${grade5Description} (2028 대입)</div>
            </div>
        </div>

        <div class="distribution-section">
            <div class="distribution-title">전체 수험생 점수 분포 (정규분포)</div>
            <div class="distribution-canvas-wrapper">
                <canvas id="distributionCanvas"></canvas>
            </div>
        </div>

        <table class="info-table">
            <tr>
                <th>전국 평균</th>
                <th>표준편차</th>
                <th>고1 예상 등급</th>
            </tr>
            <tr>
                <td style="text-align: center; font-weight: 700; color: #3498DB;">${statistics.mean.toFixed(1)}점</td>
                <td style="text-align: center; font-weight: 700; color: #3498DB;">${statistics.stdDev.toFixed(1)}</td>
                <td style="text-align: center; font-weight: 700; color: #E74C3C; font-size: 16px;">${overallScore.expectedHighSchoolGrade}</td>
            </tr>
        </table>

        <div class="section-title">02. 자기주도 학습역량 주요 요인 프로파일</div>

        <div class="profile-chart">
            <div class="chart-header">
                <span>T Score</span>
                <span style="margin-left: auto;">위험 (30 이하)</span>
                <span>주의 (30-40)</span>
                <span>보통 (40-60)</span>
                <span>우수 (60-70)</span>
                <span>최상 (70 이상)</span>
            </div>

            <div class="chart-scale">
                <span>10</span>
                <span>20</span>
                <span>30</span>
                <span>40</span>
                <span>50</span>
                <span>60</span>
                <span>70</span>
                <span>80</span>
                <span>90</span>
            </div>

${chartRows}
        </div>

        <table class="t-score-table info-table">
            <tr>
                <th>영역</th>
                <th>원점수</th>
                <th>T-Score</th>
                <th>백분위</th>
                <th>평가</th>
            </tr>
${tableRows}
        </table>

        <div class="page-number">Page 1 of 7</div>
    </div>`;
}

/**
 * 9등급 범위 텍스트 생성
 */
function getGrade9Range(grade: number, statistics: any): string {
  const ranges: Record<number, string> = {
    1: `상위 4% (${statistics.grade1Cut}점~)`,
    2: `상위 4~11% (${statistics.grade2Cut}~${statistics.grade1Cut - 1}점)`,
    3: `상위 11~23% (${statistics.grade3Cut}~${statistics.grade2Cut - 1}점)`,
    4: `상위 23~40% (${statistics.grade4Cut}~${statistics.grade3Cut - 1}점)`,
    5: `상위 40~60% (${statistics.grade5Cut}~${statistics.grade4Cut - 1}점)`,
    6: `상위 60~77%`,
    7: `상위 77~89%`,
    8: `상위 89~96%`,
    9: `상위 96~100%`,
  };
  return ranges[grade] || '';
}

/**
 * Page 2: 고교 유형별 경쟁력 분석 생성
 */
function generatePage2(result: GradingResult): string {
  const { overallScore } = result;
  const score = overallScore.earnedScore;

  // 고교 유형별 예상 경쟁력 계산
  const competitions = [
    { type: '전국 자사고/특목고', mean: 62, stdDev: 10 },
    { type: '대치동 일반고', mean: 56, stdDev: 13 },
    { type: '수도권 학군지', mean: 50, stdDev: 15 },
    { type: '비학군지 일반고', mean: 42, stdDev: 22 },
  ];

  const compBoxes = competitions.map(comp => {
    const zScore = (score - comp.mean) / comp.stdDev;
    const percentile = normalCDF(zScore) * 100;
    const topPercent = Math.max(1, Math.round(100 - percentile));
    const grade = getGradeFromPercentile(percentile);
    const diff = score - comp.mean;
    const barWidth = Math.min(100, Math.max(10, percentile));

    return `
            <div class="school-comp-box">
                <div class="school-comp-type">${comp.type}</div>
                <div class="school-comp-badges">
                    <span class="badge-percentile">상위 ${topPercent}%</span>
                    <span class="badge-grade">${grade}</span>
                    <span class="badge-diff">${diff >= 0 ? '+' : ''}${diff}점</span>
                </div>
                <div class="school-comp-bar">
                    <div class="school-comp-fill" style="width: ${barWidth}%;"></div>
                </div>
                <div class="school-comp-footer">평균 ${comp.mean}점 (표준편차 ${comp.stdDev})</div>
            </div>`;
  }).join('\n');

  // 예상 학습 조언
  const advice = overallScore.grade9 <= 2
    ? '중난도 완벽 대응력 우수. 고난도 문제(21~25번) 집중 훈련으로 1등급 달성 가능'
    : overallScore.grade9 <= 4
    ? '기본기 탄탄. 중난도 정답률 높이고 고난도 문제에 점진적으로 도전'
    : '기본 개념 완벽 습득 우선. 하/중난도 정답률 90% 이상 목표';

  return `
    <!-- Page 2: 고교 유형별 경쟁력 -->
    <div class="page">
        <div class="report-header">
            <div class="report-title">i.study 수리탐구 진단검사 결과 보고서</div>
            <div class="report-subtitle">고교 유형별 내신 경쟁력 분석</div>
        </div>

        <div class="section-title">03. 고교 유형별 내신 경쟁력 분석</div>

        <div class="school-comp-grid">
${compBoxes}
        </div>

        <div style="background: #FFF9E6; padding: 12px; border-radius: 6px; margin-top: 15px; border: 1px solid #F9E79F;">
            <p style="font-size: 11px; color: #856404; line-height: 1.6; margin-bottom: 6px;">
                <strong style="color: #3498DB;">▶ 해석 가이드:</strong><br>
                위 분석은 2024년 고1 9월 모의고사 데이터를 기반으로 한 예상치입니다.
                고교 유형별 평균과 표준편차를 고려하여 산출했으며, 실제 내신 등급은
                학교별 시험 난이도와 학생 구성에 따라 달라질 수 있습니다.
            </p>
        </div>

        <div class="section-title">04. 고1 모의고사 예상 등급</div>

        <table class="info-table">
            <tr>
                <th style="text-align: center;">현재 진단검사 등급</th>
                <th style="text-align: center;">고1 예상 등급</th>
                <th style="text-align: center;">학습 조언</th>
            </tr>
            <tr>
                <td style="text-align: center; font-size: 16px; font-weight: 700; color: #3498DB;">${overallScore.grade9}등급</td>
                <td style="text-align: center; font-size: 16px; font-weight: 700; color: #E74C3C;">${overallScore.expectedHighSchoolGrade}</td>
                <td style="font-size: 11px; line-height: 1.6;">${advice}</td>
            </tr>
        </table>

        <div class="section-title">05. 주요 대학 정시 등급컷 참고 (2024학년도)</div>

        <table class="info-table">
            <tr>
                <th>대학</th>
                <th>계열</th>
                <th>수학 등급컷</th>
            </tr>
            <tr>
                <td><strong>서울대</strong></td>
                <td>자연계</td>
                <td style="color: #E74C3C; font-weight: 700;">1등급 (88~92점)</td>
            </tr>
            <tr>
                <td><strong>연세대</strong></td>
                <td>자연계</td>
                <td style="color: #E74C3C; font-weight: 700;">1등급 초반 (85~89점)</td>
            </tr>
            <tr>
                <td><strong>고려대</strong></td>
                <td>자연계</td>
                <td style="color: #E67E22; font-weight: 700;">1~2등급 (82~87점)</td>
            </tr>
            <tr>
                <td><strong>서강대/성균관대</strong></td>
                <td>자연계</td>
                <td style="color: #F39C12; font-weight: 700;">2등급 (78~83점)</td>
            </tr>
            <tr>
                <td><strong>한양대/중앙대</strong></td>
                <td>자연계</td>
                <td style="color: #F39C12; font-weight: 700;">2~3등급 (75~80점)</td>
            </tr>
            <tr>
                <td><strong>경희대/이화여대</strong></td>
                <td>자연계</td>
                <td style="color: #27AE60; font-weight: 700;">3등급 (70~76점)</td>
            </tr>
        </table>

        <div class="page-number">Page 2 of 7</div>
    </div>`;
}

/**
 * 백분위에서 등급 문자열 반환
 */
function getGradeFromPercentile(percentile: number): string {
  if (percentile >= 96) return '1등급';
  if (percentile >= 89) return '1~2등급';
  if (percentile >= 77) return '2등급';
  if (percentile >= 60) return '2~3등급';
  if (percentile >= 40) return '3등급';
  if (percentile >= 23) return '3~4등급';
  if (percentile >= 11) return '4등급';
  if (percentile >= 4) return '4~5등급';
  return '5등급 이하';
}

/**
 * 정규분포 누적확률 계산
 */
function normalCDF(x: number): number {
  const a1 = 0.254829592;
  const a2 = -0.284496736;
  const a3 = 1.421413741;
  const a4 = -1.453152027;
  const a5 = 1.061405429;
  const p = 0.3275911;

  const sign = x < 0 ? -1 : 1;
  x = Math.abs(x) / Math.sqrt(2);

  const t = 1.0 / (1.0 + p * x);
  const y = 1.0 - (((((a5 * t + a4) * t) + a3) * t + a2) * t + a1) * t * Math.exp(-x * x);

  return 0.5 * (1.0 + sign * y);
}

/**
 * Page 3: 영역별 상세 분석 생성
 */
function generatePage3(result: GradingResult, reportData: ReportData): string {
  const { areaResults, questionResults } = result;
  const { comments } = reportData;

  const areaCards = areaResults.map(ar => {
    const level = getTScoreLevel(ar.tScore);
    const cardClass = level === 'EXCELLENT' ? 'excellent' : level === 'CRITICAL' || level === 'WEAK' ? 'weak' : '';
    const color = getTScoreColor(ar.tScore);
    const markerColor = ar.tScore >= 60 ? '#27AE60' : ar.tScore >= 40 ? '#3498DB' : '#E74C3C';

    // 해당 영역의 문항 결과
    const areaQuestions = questionResults.filter(q => q.area === ar.area);
    const questionStatus = areaQuestions.map(q =>
      `${q.questionNumber}번 ${q.isCorrect ? '○' : '✕'}`
    ).join(' | ');

    // 영역별 코멘트
    const areaComment = comments.areaComments[ar.area] || '';
    const isStrength = level === 'EXCELLENT' || level === 'GOOD';

    return `
        <div class="area-detail-card ${cardClass}">
            <div class="area-header">
                <div class="area-name">${ar.area} (${getAreaEnglishName(ar.area)})</div>
                <div class="area-stats">
                    <div class="stat-item">
                        <div class="stat-label">T-Score</div>
                        <div class="stat-value" style="color: ${color};">${ar.tScore.toFixed(1)}</div>
                    </div>
                    <div class="stat-item">
                        <div class="stat-label">정답률</div>
                        <div class="stat-value" style="color: ${color};">${ar.accuracy.toFixed(0)}%</div>
                    </div>
                </div>
            </div>

            <div class="distribution-container">
                <div class="distribution-curve">
                    <div class="distribution-marker" style="left: ${Math.min(95, Math.max(5, ar.percentile))}%;">
                        <div class="distribution-label" style="background: ${markerColor};">현재 위치</div>
                    </div>
                </div>
                <div class="distribution-scale">
                    <span>하위</span>
                    <span>20%</span>
                    <span>40%</span>
                    <span>60%</span>
                    <span>80%</span>
                    <span>상위</span>
                </div>
            </div>

            <div style="background: white; padding: 12px; border-radius: 4px; font-size: 12px; line-height: 1.6; color: #555;">
                ${isStrength ? `<strong style="color: #27AE60;">✓ 강점 영역</strong><br>` : level === 'WEAK' || level === 'CRITICAL' ? `<strong style="color: #E74C3C;">⚠ 집중 보완 필요</strong><br>` : ''}
                ${areaComment}
            </div>

            <div style="margin-top: 10px; font-size: 11px; color: #7F8C8D;">
                <strong>문항별 정답 현황:</strong> ${questionStatus}
            </div>
        </div>`;
  }).join('\n');

  return `
    <!-- Page 3: 영역별 상세 분석 -->
    <div class="page">
        <div class="report-header">
            <div class="report-title">i.study 수리탐구 진단검사 결과 보고서</div>
            <div class="report-subtitle">영역별 상세 분석</div>
        </div>

        <div class="section-title">06. 영역별 상세 분석</div>

${areaCards}

        <div class="page-number">Page 3 of 7</div>
    </div>`;
}

/**
 * Page 4-5: 학습 전략 멘트 생성
 */
function generatePages4and5(strategies: StrategyComment[]): string {
  const firstThree = strategies.slice(0, 3);
  const lastThree = strategies.slice(3, 6);

  const generateMentBox = (strategy: StrategyComment) => `
        <div class="ment-box">
            <div class="ment-header">
                <span class="ment-category">${strategy.categoryName}</span>
                <span class="ment-number">#${strategy.commentNumber}</span>
            </div>
            <h4 class="ment-title">${strategy.title}</h4>
            <p class="ment-content">${strategy.comment}</p>
            <div class="ment-summary">
                <strong>핵심:</strong> ${strategy.recommendation === 'left' ? strategy.leftOption : strategy.recommendation === 'right' ? strategy.rightOption : '균형'} 전략 권장
            </div>
        </div>`;

  const page4 = `
    <!-- Page 4: 학습 전략 멘트 (1~3) -->
    <div class="page">
        <div class="report-header">
            <div class="report-title">i.study 수리탐구 진단검사 결과 보고서</div>
            <div class="report-subtitle">맞춤 학습 전략 가이드</div>
        </div>

        <div class="section-title">07. 맞춤 학습 전략 가이드</div>

${firstThree.map(generateMentBox).join('\n')}

        <div class="page-number">Page 4 of 7</div>
    </div>`;

  const page5 = `
    <!-- Page 5: 학습 전략 멘트 (4~6) -->
    <div class="page">
        <div class="report-header">
            <div class="report-title">i.study 수리탐구 진단검사 결과 보고서</div>
            <div class="report-subtitle">맞춤 학습 전략 가이드 (계속)</div>
        </div>

        <div class="section-title">07. 맞춤 학습 전략 가이드 (계속)</div>

${lastThree.map(generateMentBox).join('\n')}

        <div style="background: #E7F3FF; padding: 15px; border-radius: 6px; margin-top: 15px; border: 2px solid #3498DB;">
            <h3 style="font-size: 14px; color: #3498DB; margin-bottom: 10px; text-align: center;">
                ▶ 종합 학습 방향 제안
            </h3>
            <ul style="list-style: none; padding: 0;">
                <li style="padding: 6px 0; padding-left: 20px; position: relative; font-size: 12px; color: #333; line-height: 1.6;">
                    <span style="position: absolute; left: 0; color: #3498DB; font-weight: 700;">1.</span>
                    <strong>단기 목표 (1~2개월):</strong> 취약 영역 집중 보완으로 점수 향상
                </li>
                <li style="padding: 6px 0; padding-left: 20px; position: relative; font-size: 12px; color: #333; line-height: 1.6;">
                    <span style="position: absolute; left: 0; color: #3498DB; font-weight: 700;">2.</span>
                    <strong>중기 목표 (3~6개월):</strong> 고난도 문제 도전으로 등급 상승
                </li>
                <li style="padding: 6px 0; padding-left: 20px; position: relative; font-size: 12px; color: #333; line-height: 1.6;">
                    <span style="position: absolute; left: 0; color: #3498DB; font-weight: 700;">3.</span>
                    <strong>장기 목표 (고1 대비):</strong> 고등 수학 선행과 심화 학습 병행
                </li>
            </ul>
        </div>

        <div class="page-number">Page 5 of 7</div>
    </div>`;

  return page4 + page5;
}

/**
 * Page 6: 난이도별 분석 생성
 */
function generatePage6(result: GradingResult): string {
  const { difficultyResults, questionResults, areaResults } = result;

  // 난이도별 테이블 행
  const difficultyLabels: Record<string, string> = {
    LOW: '하난도',
    MID: '중난도',
    HIGH: '고난도',
  };

  const diffRows = difficultyResults.map(dr => {
    const color = getAccuracyColor(dr.accuracy);
    const evaluation = dr.accuracy >= 90 ? '우수' : dr.accuracy >= 70 ? '양호' : dr.accuracy >= 50 ? '보통' : '집중 훈련 필요';

    return `
            <tr>
                <td><strong>${difficultyLabels[dr.difficulty]}</strong></td>
                <td style="text-align: center; font-size: 18px; font-weight: 700; color: ${color};">${dr.accuracy.toFixed(0)}%</td>
                <td style="text-align: center;">${dr.correctCount}/${dr.totalCount}</td>
                <td style="font-size: 11px;">${evaluation}</td>
            </tr>`;
  }).join('\n');

  // 영역별 문항 정답 현황
  const areaQuestionBoxes = areaResults.map(ar => {
    const areaQuestions = questionResults.filter(q => q.area === ar.area);
    const correctCount = areaQuestions.filter(q => q.isCorrect).length;
    const totalCount = areaQuestions.length;
    const accuracy = (correctCount / totalCount) * 100;
    const headerColor = accuracy >= 90 ? '#27AE60' : accuracy >= 70 ? '#F39C12' : '#E74C3C';

    const questionBoxes = areaQuestions.map(q => {
      const bgColor = q.isCorrect ? '#D5F4E6' : '#FADBD8';
      const borderColor = q.isCorrect ? '#27AE60' : '#E74C3C';
      const textColor = q.isCorrect ? '#27AE60' : '#E74C3C';
      const symbol = q.isCorrect ? '○' : '✕';

      return `<span style="display: inline-block; width: 32px; height: 32px; background: ${bgColor}; border: 2px solid ${borderColor}; border-radius: 4px; text-align: center; line-height: 28px; font-size: 11px; font-weight: 700; color: ${textColor};">${getCircledNumber(q.questionNumber)}${symbol}</span>`;
    }).join('\n                ');

    const startNum = areaQuestions[0]?.questionNumber || 0;
    const endNum = areaQuestions[areaQuestions.length - 1]?.questionNumber || 0;

    return `
        <div style="background: #FAFAFA; padding: 15px; border-radius: 6px; margin-bottom: 12px;">
            <h4 style="font-size: 13px; color: ${headerColor}; font-weight: 700; margin-bottom: 8px;">[${ar.area}] (${startNum}~${endNum}번) - ${correctCount}/${totalCount} 정답 (${accuracy.toFixed(0)}%)</h4>
            <div style="display: flex; gap: 6px; flex-wrap: wrap;">
                ${questionBoxes}
            </div>
        </div>`;
  }).join('\n');

  // 오답 분석 메시지
  const incorrectQuestions = questionResults.filter(q => !q.isCorrect);
  const incorrectNums = incorrectQuestions.map(q => q.questionNumber).join(', ');

  return `
    <!-- Page 6: 난이도별 분석 -->
    <div class="page">
        <div class="report-header">
            <div class="report-title">i.study 수리탐구 진단검사 결과 보고서</div>
            <div class="report-subtitle">난이도별 분석</div>
        </div>

        <div class="section-title">08. 난이도별 정답률 분석</div>

        <table class="info-table">
            <tr>
                <th style="width: 30%;">난이도</th>
                <th style="width: 20%;">정답률</th>
                <th style="width: 25%;">정답 수</th>
                <th>평가</th>
            </tr>
${diffRows}
        </table>

        <div style="background: #FFF3E0; padding: 15px; border-radius: 6px; margin-top: 15px; border: 1px solid #FFB74D;">
            <p style="font-size: 12px; color: #E65100; line-height: 1.7;">
                <strong>▶ 오답 문항:</strong> ${incorrectNums || '없음'}<br>
                오답 문항을 집중 복습하여 유사 유형을 완벽히 대비하세요.
            </p>
        </div>

        <div class="section-title">09. 문항별 정답 현황</div>

${areaQuestionBoxes}

        <div class="page-number">Page 6 of 7</div>
    </div>`;
}

/**
 * Page 7: 학습 로드맵 생성
 */
function generatePage7(result: GradingResult, reportData: ReportData): string {
  const { studentInfo, overallScore, areaResults, statistics } = result;
  const { comments } = reportData;
  const roadmap = comments.roadmap;

  // 취약 영역 찾기
  const weakAreas = areaResults
    .filter(ar => ar.tScore < 50)
    .map(ar => ar.area);

  const targetScore = Math.min(100, overallScore.earnedScore + 15);
  const targetGrade = overallScore.grade9 > 1 ? overallScore.grade9 - 1 : 1;

  return `
    <!-- Page 7: 학습 로드맵 -->
    <div class="page">
        <div class="report-header">
            <div class="report-title">i.study 수리탐구 진단검사 결과 보고서</div>
            <div class="report-subtitle">3개월 맞춤 학습 로드맵</div>
        </div>

        <div class="section-title">10. 3개월 맞춤 학습 로드맵</div>

        <div class="ment-box" style="border-left-color: #3498DB;">
            <h4 style="font-size: 14px; color: #2C3E50; font-weight: 700; margin-bottom: 10px;">1단계 (1~2개월): 취약 영역 집중 보완</h4>
            <p style="font-size: 12px; color: #555; line-height: 1.7;">${roadmap.step1}</p>
        </div>

        <div class="ment-box" style="border-left-color: #27AE60;">
            <h4 style="font-size: 14px; color: #2C3E50; font-weight: 700; margin-bottom: 10px;">2단계 (2~3개월): 고난도 문제 도전</h4>
            <p style="font-size: 12px; color: #555; line-height: 1.7;">${roadmap.step2}</p>
        </div>

        <div class="ment-box" style="border-left-color: #F39C12;">
            <h4 style="font-size: 14px; color: #2C3E50; font-weight: 700; margin-bottom: 10px;">3단계 (3개월 이후): 고등 선행 준비</h4>
            <p style="font-size: 12px; color: #555; line-height: 1.7;">${roadmap.step3}</p>
        </div>

        <div style="background: white; border: 3px solid #3498DB; padding: 20px; border-radius: 8px; margin-top: 20px; text-align: center;">
            <div style="font-size: 13px; color: #7F8C8D; margin-bottom: 8px; font-weight: 600;">최종 목표</div>
            <div style="font-size: 18px; font-weight: 700; color: #2C3E50; line-height: 1.5;">
                진단검사 <span style="color: #E74C3C;">${targetScore}점 이상 (${targetGrade}등급)</span><br>
                <span style="font-size: 16px; color: #7F8C8D;">+</span><br>
                고1 모의고사 <span style="color: #3498DB;">${overallScore.expectedHighSchoolGrade} 달성!</span>
            </div>
        </div>

        <div style="margin-top: 20px; padding: 15px; background: #FFF9E6; border-radius: 6px; border: 1px solid #F9E79F;">
            <h4 style="font-size: 13px; color: #856404; margin-bottom: 10px;">▶ 진단검사 해석 가이드</h4>
            <p style="font-size: 11px; color: #856404; line-height: 1.6; margin-bottom: 8px;">
                본 진단검사는 고등과정 적응력 측정 목적으로, 일반 학교 시험보다 높은 난이도로 출제되었습니다.
            </p>
            <div style="padding-left: 15px; margin: 8px 0;">
                <div style="font-size: 10px; color: #856404; margin: 3px 0;">• 일반 학교 시험 평균: 70점대</div>
                <div style="font-size: 10px; color: #856404; margin: 3px 0;">• 고1 9월 모의고사 평균: 43~45점</div>
                <div style="font-size: 10px; color: #856404; margin: 3px 0;">• 본 진단검사(${studentInfo.testType}) 평균: ${statistics.mean}점</div>
            </div>
            <p style="font-size: 11px; color: #E74C3C; font-weight: 600; margin-top: 8px;">
                ▶ 예상 등급은 현재 실력 기준이며, 체계적이고 꾸준한 학습을 통해 충분히 향상 가능합니다!
            </p>
        </div>

        <div style="margin-top: 15px; text-align: center; padding: 12px; background: #F8F9FA; border-radius: 6px;">
            <p style="font-size: 11px; color: #7F8C8D;">
                <strong>발행:</strong> i.study 수리탐구<br>
                <strong>문의:</strong> 02-XXXX-XXXX | info@istudy.com
            </p>
        </div>

        <div class="page-number">Page 7 of 7</div>
    </div>`;
}

/**
 * JavaScript 코드 생성 (정규분포 그래프)
 */
function generateScript(result: GradingResult): string {
  const { overallScore, statistics } = result;

  return `
    <script>
        function drawDistribution() {
            const canvas = document.getElementById('distributionCanvas');
            if (!canvas) return;

            const ctx = canvas.getContext('2d');
            const width = canvas.width = canvas.offsetWidth * 2;
            const height = canvas.height = canvas.offsetHeight * 2;
            ctx.scale(2, 2);

            const actualWidth = width / 2;
            const actualHeight = height / 2;

            const mean = ${statistics.mean};
            const stdDev = ${statistics.stdDev};

            function normalDist(x, mean, stdDev) {
                const coefficient = 1 / (stdDev * Math.sqrt(2 * Math.PI));
                const exponent = -Math.pow(x - mean, 2) / (2 * Math.pow(stdDev, 2));
                return coefficient * Math.exp(exponent);
            }

            const maxY = normalDist(mean, mean, stdDev);

            ctx.clearRect(0, 0, actualWidth, actualHeight);

            ctx.fillStyle = 'rgba(52, 152, 219, 0.08)';
            ctx.beginPath();
            ctx.moveTo(0, actualHeight - 25);

            for (let x = 0; x <= 100; x += 0.3) {
                const px = (x / 100) * actualWidth;
                const y = normalDist(x, mean, stdDev);
                const py = actualHeight - 25 - ((y / maxY) * (actualHeight - 40));
                ctx.lineTo(px, py);
            }

            ctx.lineTo(actualWidth, actualHeight - 25);
            ctx.closePath();
            ctx.fill();

            ctx.strokeStyle = '#3498DB';
            ctx.lineWidth = 2.5;
            ctx.beginPath();

            for (let x = 0; x <= 100; x += 0.3) {
                const px = (x / 100) * actualWidth;
                const y = normalDist(x, mean, stdDev);
                const py = actualHeight - 25 - ((y / maxY) * (actualHeight - 40));

                if (x === 0) {
                    ctx.moveTo(px, py);
                } else {
                    ctx.lineTo(px, py);
                }
            }
            ctx.stroke();

            ctx.strokeStyle = '#BDC3C7';
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.moveTo(0, actualHeight - 25);
            ctx.lineTo(actualWidth, actualHeight - 25);
            ctx.stroke();

            ctx.fillStyle = '#7F8C8D';
            ctx.font = '10px "Noto Sans KR"';
            ctx.textAlign = 'center';

            const labels = [0, 20, 40, 60, 80, 100];
            labels.forEach(label => {
                const x = (label / 100) * actualWidth;
                ctx.fillText(label, x, actualHeight - 8);
            });

            const meanX = (mean / 100) * actualWidth;
            ctx.strokeStyle = '#F39C12';
            ctx.lineWidth = 2;
            ctx.setLineDash([4, 4]);
            ctx.beginPath();
            ctx.moveTo(meanX, 15);
            ctx.lineTo(meanX, actualHeight - 25);
            ctx.stroke();
            ctx.setLineDash([]);

            ctx.fillStyle = '#F39C12';
            ctx.font = 'bold 10px "Noto Sans KR"';
            ctx.fillText('평균: ' + mean + '점', meanX, 10);

            const studentScore = ${overallScore.earnedScore};
            const studentX = (studentScore / 100) * actualWidth;
            ctx.strokeStyle = '#E74C3C';
            ctx.lineWidth = 2;
            ctx.setLineDash([4, 4]);
            ctx.beginPath();
            ctx.moveTo(studentX, 15);
            ctx.lineTo(studentX, actualHeight - 25);
            ctx.stroke();
            ctx.setLineDash([]);

            ctx.fillStyle = '#E74C3C';
            ctx.font = 'bold 10px "Noto Sans KR"';
            ctx.fillText('내 점수: ' + studentScore + '점', studentX, 10);
        }

        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', function() {
                setTimeout(drawDistribution, 100);
            });
        } else {
            setTimeout(drawDistribution, 100);
        }

        window.addEventListener('resize', function() {
            setTimeout(drawDistribution, 100);
        });
    </script>`;
}

// ============== 메인 함수 ==============

export interface HtmlReportOptions {
  progressLevel?: ProgressLevel;
}

/**
 * 채점 결과를 7페이지 HTML 보고서로 변환
 *
 * @param gradingResult - 채점 결과
 * @param options - 옵션 (진도 수준 등)
 * @returns HTML 문자열
 */
export function generateHtmlReport(
  gradingResult: GradingResult,
  options: HtmlReportOptions = {}
): string {
  const { progressLevel = '보통' } = options;

  // 1. 보고서 데이터 생성
  const reportData = generateReportData(gradingResult);

  // 2. 학습 전략 생성
  const studentProfile = createStudentProfile(
    gradingResult.studentInfo.testType,
    gradingResult.overallScore.grade9,
    progressLevel
  );
  const learningStrategies = generateLearningStrategies(studentProfile);

  // 3. HTML 생성
  const html = `<!DOCTYPE html>
<html lang="ko">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>i.study 수리탐구 진단검사 결과 보고서 - ${gradingResult.studentInfo.studentName}</title>
${generateStyles()}
</head>
<body>
${generatePage1(gradingResult, reportData)}
${generatePage2(gradingResult)}
${generatePage3(gradingResult, reportData)}
${generatePages4and5(learningStrategies.strategies)}
${generatePage6(gradingResult)}
${generatePage7(gradingResult, reportData)}
${generateScript(gradingResult)}
</body>
</html>`;

  return html;
}

/**
 * 채점 결과를 파일로 저장할 수 있는 형태의 보고서 데이터 반환
 */
export function generateReportBundle(
  gradingResult: GradingResult,
  options: HtmlReportOptions = {}
): {
  html: string;
  reportData: ReportData;
  strategies: StrategyComment[];
} {
  const { progressLevel = '보통' } = options;

  const reportData = generateReportData(gradingResult);
  const studentProfile = createStudentProfile(
    gradingResult.studentInfo.testType,
    gradingResult.overallScore.grade9,
    progressLevel
  );
  const learningStrategies = generateLearningStrategies(studentProfile);
  const html = generateHtmlReport(gradingResult, options);

  return {
    html,
    reportData,
    strategies: learningStrategies.strategies,
  };
}
