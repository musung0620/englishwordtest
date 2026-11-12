# 나만의 영어 단어장 (My Vocabulary Notebook)

Firebase (`englishwordtest-6244e`)와 Vite + React로 제작된 개인 맞춤형 영어 단어장 웹 애플리케이션입니다.

---

## 🌟 주요 기능

1. **Google 계정 로그인 / 로그아웃**
   - Firebase Authentication(GoogleAuthProvider)을 이용한 원클릭 Google 로그인
   - 사용자 프로필 사진 및 이름 표시

2. **단어 CRUD (추가, 수정, 삭제)**
   - 영어 단어, 뜻(한글 의미), 예문(선택), 외움 여부 등록
   - 모달을 통한 직관적인 단어 추가 및 수정
   - 삭제 전 확인 다이얼로그 제공

3. **Cloud Firestore 데이터 영구 보관**
   - 실시간 리스너(`onSnapshot`)를 통해 새로고침 및 멀티 기기에서도 실시간 동기화
   - 작성일(`createdAt`), 수정일(`updatedAt`) 타임스탬프 자동 관리

4. **사용자별 데이터 완전 격리 및 보안 규칙 적용**
   - 데이터 경로: `users/{userId}/words/{wordId}`
   - Firestore Security Rules(`firestore.rules`)를 통해 본인의 `userId`가 일치하는 로그인 사용자만 자신의 단어에 읽기/쓰기/수정/삭제 권한 부여 (타인 데이터 열람 및 변조 원천 차단)

5. **환경변수 분리 (`.env`)**
   - 모든 Firebase 설정값은 Vite 표준인 `VITE_` 접두사를 적용하여 `.env`로 안전하게 분리

6. **추가 사용자 편의 기능**
   - 🔊 **원어민 발음 듣기**: Web Speech API 기반 미국식 영어 발음 원클릭 재생
   - 🔍 **실시간 검색**: 단어, 뜻, 예문 키워드로 즉시 필터링
   - 🏷️ **필터 탭**: 전체 / 외우는 중 / 다 외움 탭 분류
   - 📊 **학습 통계 및 프로그레스 바**: 전체 단어 수, 외운 단어 수, 진도율(%) 시각화
   - 🎉 **축하 효과**: 단어를 '다 외움'으로 표시할 때 콘페티(폭죽) 애니메이션 동작

---

## 🚀 실행 방법

### 1. 개발 서버 실행
```bash
npm run dev
```
브라우저에서 `http://localhost:5173`으로 자동 실행됩니다.

### 2. 프로덕션 빌드
```bash
npm run build
```

---

## ⚠️ Firebase 콘솔 필수 설정 안내 (최초 1회)

Google 로그인이 정상 작동하려면 Firebase 콘솔에서 Google 제공업체를 활성화해야 합니다:

1. [Firebase Console Authentication](https://console.firebase.google.com/project/englishwordtest-6244e/authentication/providers) 접속
2. **시작하기(Get started)** 클릭 후 **Sign-in method(로그인 방법)** 탭으로 이동
3. **Google** 공급업체 클릭 &rarr; **사용 설정(Enable)** 토글 켜기 &rarr; 프로젝트 지원 이메일 선택 후 **저장** 클릭
