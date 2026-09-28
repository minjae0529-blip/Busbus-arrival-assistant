# 🚀 GitHub 커밋 & 푸시 완전 가이드 (비전공자용)

> 터미널(명령어 창)에서 내 코드를 GitHub에 올리는 전체 과정을 단계별로 정리했습니다.
> 복사해서 붙여넣기만 하면 됩니다!

---

## 📖 용어 정리 (먼저 읽기!)

| 용어 | 쉬운 설명 |
|------|-----------|
| **Git** | 코드 변경 이력을 관리하는 프로그램 (타임머신 같은 것) |
| **GitHub** | Git으로 관리하는 코드를 인터넷에 올려두는 사이트 |
| **Repository (레포)** | 프로젝트 폴더. GitHub에 만드는 저장소 |
| **commit (커밋)** | "저장" 버튼. 변경사항을 기록하는 것 |
| **push (푸시)** | 내 컴퓨터의 커밋을 GitHub(인터넷)에 업로드하는 것 |
| **pull (풀)** | GitHub에 있는 코드를 내 컴퓨터로 다운로드하는 것 |
| **branch (브랜치)** | 작업 공간. 보통 `main`이 기본 |
| **remote (리모트)** | 연결된 원격 저장소 (GitHub 주소) |
| **clone (클론)** | GitHub 레포를 내 컴퓨터에 복사하는 것 |
| **PAT** | Personal Access Token. GitHub 비밀번호 대신 쓰는 인증 키 |

---

## 🔧 0단계: 사전 준비 (최초 1회만)

### Git 설치 확인
```bash
git --version
```
> `git version 2.xx.x` 같은 결과가 나오면 설치 완료!
> 안 나오면 👉 https://git-scm.com/downloads 에서 설치

### 내 정보 등록 (최초 1회)
```bash
git config --global user.name "내이름"
git config --global user.email "내이메일@gmail.com"
```
> ⚠️ GitHub 계정에 등록된 이메일과 동일하게 적어주세요

### PAT (Personal Access Token) 발급
1. GitHub 로그인
2. 우측 상단 **프로필 아이콘** → **Settings**
3. 왼쪽 메뉴 맨 아래 **Developer settings**
4. **Personal access tokens** → **Tokens (classic)**
5. **Generate new token (classic)** 클릭
6. 설정:
   - **Note**: 아무 이름 (예: `my-token`)
   - **Expiration**: 유효기간 선택 (90일 추천)
   - **Select scopes**: ✅ `repo` 체크
7. **Generate token** 클릭
8. `ghp_xxxxxxxx` 형태의 토큰 **복사해서 안전한 곳에 저장**

> [!CAUTION]
> 토큰은 **한 번만 보여줍니다!** 페이지를 닫으면 다시 볼 수 없으니 꼭 복사해두세요.

---

## 📁 1단계: 새 프로젝트 시작하기

### 방법 A: 내 컴퓨터에서 새로 시작 → GitHub에 올리기

#### 1-1. GitHub에서 빈 레포 만들기
1. https://github.com → **New repository** (우측 상단 `+` 버튼)
2. Repository name 입력 (예: `my-project`)
3. **⚠️ "Add a README file" 체크 해제** (빈 레포로 만들기)
4. **Create repository** 클릭
5. 생성된 레포 URL 복사 (예: `https://github.com/내아이디/my-project.git`)

#### 1-2. 내 컴퓨터에서 Git 초기화
```bash
# 프로젝트 폴더로 이동
cd /Users/내이름/Documents/my-project

# Git 시작 (이 폴더를 Git으로 관리하겠다!)
git init

# 기본 브랜치 이름을 main으로 설정
git branch -M main
```

#### 1-3. GitHub 연결
```bash
# GitHub 레포 주소 연결 (위에서 복사한 URL)
git remote add origin https://github.com/내아이디/my-project.git
```

#### 1-4. 첫 커밋 & 푸시
```bash
# 모든 파일 추가
git add .

# 커밋 (메시지와 함께 저장)
git commit -m "첫 번째 커밋: 프로젝트 초기 설정"

# GitHub에 업로드
git push -u origin main
```
> Username → GitHub 아이디 입력
> Password → **PAT 토큰** 붙여넣기 (입력해도 화면에 안 보이는 게 정상!)

---

### 방법 B: GitHub 레포를 내 컴퓨터로 가져오기 (clone)

```bash
# 원하는 폴더로 이동
cd /Users/내이름/Documents

# GitHub 레포 복사
git clone https://github.com/내아이디/my-project.git

# 복사된 폴더로 이동
cd my-project
```
> clone하면 remote 연결이 자동으로 되어있어서 바로 작업 가능!

---

## ✏️ 2단계: 코드 수정 후 커밋 & 푸시 (매일 반복)

### 핵심 3줄 명령어 (이것만 기억하세요!)

```bash
git add .                          # 1. 변경된 파일 전부 준비
git commit -m "변경 내용 설명"       # 2. 저장 (커밋)
git push                           # 3. GitHub에 업로드
```

### 자세한 설명

#### STEP 1: 뭐가 바뀌었는지 확인
```bash
git status
```
- 🔴 빨간색 = 아직 추가 안 된 파일 (수정/새파일)
- 🟢 초록색 = 커밋 준비 완료된 파일

#### STEP 2: 파일 추가 (스테이징)
```bash
# 모든 변경 파일 추가
git add .

# 특정 파일만 추가하고 싶을 때
git add 파일이름.java
git add src/main/java/MyFile.java
```

#### STEP 3: 커밋 (저장)
```bash
git commit -m "로그인 기능 추가"
```
> 💡 커밋 메시지는 **뭘 바꿨는지** 간단히 적어주세요

#### STEP 4: 푸시 (업로드)
```bash
git push
```

---

## 📋 3단계: 커밋 메시지 잘 쓰는 법

### 추천 형식
```
타입: 설명
```

### 타입 종류

| 타입 | 의미 | 예시 |
|------|------|------|
| `feat` | 새 기능 추가 | `feat: 버스 도착 알림 기능 추가` |
| `fix` | 버그 수정 | `fix: 지도 표시 오류 수정` |
| `docs` | 문서 수정 | `docs: README 업데이트` |
| `style` | 디자인/UI 변경 | `style: 메인 화면 색상 변경` |
| `refactor` | 코드 정리 | `refactor: 중복 코드 제거` |
| `test` | 테스트 추가 | `test: 로그인 테스트 추가` |
| `chore` | 설정/빌드 변경 | `chore: 빌드 스크립트 수정` |

### 예시
```bash
git commit -m "feat: 즐겨찾기 정류장 저장 기능 추가"
git commit -m "fix: 버스 도착 시간 계산 오류 수정"
git commit -m "style: 다크 모드 지원"
git commit -m "docs: 설치 방법 README에 추가"
```

---

## 🔍 4단계: 유용한 명령어 모음

### 상태 확인

```bash
# 현재 변경 상태 확인
git status

# 커밋 이력 보기 (간단하게)
git log --oneline -10

# 어떤 파일이 바뀌었는지 자세히 보기
git diff
```

### 되돌리기

```bash
# 아직 커밋 안 한 변경사항 취소 (파일 1개)
git checkout -- 파일이름.java

# 방금 한 커밋 취소 (변경사항은 유지)
git reset --soft HEAD~1

# add 취소 (스테이징 해제)
git reset HEAD 파일이름.java
```

### 브랜치 (작업 공간 나누기)

```bash
# 새 브랜치 만들고 이동
git checkout -b 새브랜치이름

# 브랜치 목록 보기
git branch

# main 브랜치로 돌아가기
git checkout main

# 브랜치 삭제
git branch -d 브랜치이름
```

### GitHub에서 최신 코드 가져오기

```bash
# GitHub의 최신 코드를 내 컴퓨터에 반영
git pull
```

---

## 🛡️ 5단계: .gitignore (올리면 안 되는 파일 설정)

프로젝트 루트에 `.gitignore` 파일을 만들어 GitHub에 올리지 않을 파일을 지정합니다.

```gitignore
# 빌드 결과물
target/
build/
*.jar
*.class

# IDE 설정 파일
.idea/
.vscode/
*.iml

# OS 시스템 파일
.DS_Store
Thumbs.db

# 환경 변수 / 비밀 정보
.env
*.secret

# 로그
*.log
```

---

## ❗ 자주 하는 실수 & 해결법

### 실수 1: push 할 때 인증 오류
```
remote: Support for password authentication was removed
```
**해결**: 비밀번호 대신 **PAT 토큰**을 입력하세요 (0단계 참고)

### 실수 2: push 거부됨
```
! [rejected] main -> main (fetch first)
```
**해결**: 다른 곳에서 변경이 있어서 먼저 pull 해야 합니다
```bash
git pull --rebase origin main
git push
```

### 실수 3: 민감한 정보(비밀번호, 토큰)를 커밋해버림
**해결**: 
1. 해당 토큰/비밀번호를 즉시 **폐기** (GitHub에서 삭제)
2. 새로 발급
3. `.gitignore`에 해당 파일 추가

### 실수 4: 잘못된 파일을 add 함
```bash
git reset HEAD 파일이름    # add 취소
```

### 실수 5: 커밋 메시지 오타
```bash
git commit --amend -m "수정된 메시지"   # 직전 커밋 메시지 수정
```

---

## 🗺️ 전체 흐름 요약

```
[내 컴퓨터]                          [GitHub]
    │                                    │
    ├── git init                         │
    ├── git remote add origin URL ───────┤  (연결)
    │                                    │
    ├── 코드 작성/수정                     │
    ├── git add .                        │
    ├── git commit -m "메시지"            │
    ├── git push ───────────────────────→│  (업로드)
    │                                    │
    ├── git pull ←───────────────────────┤  (다운로드)
    │                                    │
```

---

## ⚡ 매일 쓰는 명령어 치트시트

```bash
# 🔄 아침에 시작할 때
git pull                              # 최신 코드 가져오기

# ✏️ 코드 수정 후
git status                            # 뭐가 바뀌었는지 확인
git add .                             # 전부 추가
git commit -m "feat: 기능 설명"        # 저장
git push                              # GitHub에 업로드

# 🔍 확인할 때
git log --oneline -5                  # 최근 커밋 5개 보기
git diff                              # 변경 내용 보기
```

> [!TIP]
> 매일 퇴근 전에 `git add . → git commit → git push` 습관을 들이면 코드를 잃어버릴 걱정이 없습니다! 💪
