# R4 #67 Successor Gate C Activation Card

- Status: **`SUCCESSOR_NOT_APPROVABLE_V4_FAILED_CLEAN_LOCAL_BUDGET_EXHAUSTED_PRODUCTION_NOT_REQUESTED_GATE_C_NOT_REQUESTED`**
- Updated: 2026-08-17
- Current predecessor: failed-clean Local PostgreSQL Integration Campaign V4
- Gate C authority: **NOT_REQUESTED**

This remains a deliberately non-approvable current-state card. It records why
Gate C is still closed after Integration Campaign V4 consumed the final local
lifecycle budget and failed cleanly before PostgreSQL. It cannot prepare or consume a
campaign grant, call Docker, pull an image, inspect or remove named Docker
resources, run PostgreSQL, migrate production, activate a route or carry
traffic.

## Current truth

Integration Campaign V4 matched Docker `29.3.1 / linux/arm64` and the corrected
historical container-missing fingerprint, then stopped before PostgreSQL when
historical network inspect returned a distinct unadmitted body-free missing
fingerprint. Fresh resources are proven absent and owned residue is zero.
Terminal evidence is `sha256:fb44fbd…1166b`, journal `12` at
`sha256:df1e0c8c…d60f`, and the V4 outcome report is
`sha256:820f9878…f67b`. Target PostgreSQL/catalog are not observed. All three
local lifecycles in the confirmed envelope are consumed; no retry or successor
campaign authority exists. A new Owner decision is required. Production,
traffic and Gate C remain false. This card is not Gate-C authority.

### Current correction bindings

| Binding | Exact value |
|---|---|
| Inspect-Fingerprint Addendum / Review | `sha256:ef63d738a208c3c2469e8c7f290daaf9ffe2e8166b696239436a3b22abf4bf39` / `sha256:f09f4b010a535dca9f9d11d9e07a31e82bd5a6e9b607def85648808130756c37` |
| Kif HEAD / tree / G2 | `169a05f0e00a5afdb9cc920c0d3591a90eaa4fe6` / `efabdf042824e9fcde653006cdda58484deed38c` / `sha256:a3d507759c341d58f19a5aea7324641f8de86335ef9b1b21e32e1c0b1d73406e` |
| Lif HEAD / tree / G3 | `2d5fc50db12024c8d8fb564e7b61ced96ab6d592` / `df6fbe0d9c198a13c99368b1296d0d4741b8dcc3` / `sha256:920737b7ab3be7efdb47cc968430b07ba2016c9480f728aae359bf2eebc3a4d1` |
| index / schema / evidence / report | `sha256:d2d06ec56ba45098902ee862e105da8024eb1e57a6a99d926a4aacde647abfe3` / `sha256:a21933635e1c567405b00027c9b6b9da11860822573339022c1593c4bb63cf3f` / `sha256:f981594dc1c20b96c2fae2569d7612b02f1f7e44f2323ea9b8731c04ef8479b8` / `sha256:b277ab9d58cdf5354417191c9b0a124bd5302777fa9dbc3b21395e79335988dd` |
| failed V3 grant / evidence / journal | `sha256:b172216dc673fe42456b94f3e64790e7866ec097c59039a4952ccc8ea2714fa7` / `sha256:06c21a912e1082078ccd14d36b68e564f979fbde3b7133e3743bbe8886026cac` / `9` at `sha256:696c92d3f404e4ea44d315c4bb1eb86f8e1ae9b1c7c6ffbda616bd488223b9b5` |
| V4 Card / Review / payload | `sha256:f867ee4fc7ede804d45913b4a8afe28bce7b0510c82dd19dd620715b51c777ec` / `sha256:a3bf61dd54aafe999ee9c0056a6e35a78c8d36e263a054985c5e63e02351f29f` / `sha256:780a4afc94fb32f4748354519e88bb0528d544ce1d2b78c5d9b4a7015601f859` |
| failed V4 grant / evidence / journal | `sha256:544f8036b712b1766805fc795fe737ce630c36ee1db4b8091ab538c4c876d517` / `sha256:fb44fbd9bbbd0b39f31beff266f4a6795ac4ccc74946d3543a88bf0a8ee1166b` / `12` at `sha256:df1e0c8cd7dec7cc1f02748395e41f8890fb250de7d1bc21d6a6069455b7d60f` |
| V4 outcome report | `sha256:820f98788f44bf18d0ecf857f45ec69a0d966a2e43f27c1da4e40da068d9f67b` |

### Historical path to this stop

R1–R3 are Owner-accepted and #66 completed Owner Experience Acceptance for its
local-only Projection review. #67 has repository/offline Public Core,
hash-pinned SQL, a concrete `pg` executor and 20-method application store
bridge. Earlier physical and cleanup-rescue attempts consumed their exact
authorities and failed closed before PostgreSQL; the later V1 diagnostic
prepare failed before grant creation and before Docker/socket effects. Those
histories remain immutable and non-retryable.

The corrected Integration Campaign V2 was later prepared and consumed once.
It proved the historical container/network/volume names absent, then stopped
before PostgreSQL because the pinned image descriptor did not match the
separately pinned linux/arm64 manifest digest. Its body-free terminal receipt
did not retain the descriptor value, so the repository cannot honestly choose
a correction yet. A separately approved one-use image-manifest diagnostic was
later consumed and stopped at `IMAGE_MISSING`. The first image-acquisition
diagnostic was then prepared and consumed once; its Docker `version` call
completed `NONZERO / exit 1`, and it stopped before inspect or pull. The Owner
reports Docker Desktop was not running then and is running now, but this card
does not treat that as a machine observation. Kiar/Liar now construct the
fresh V2 replacement authority path. No image pin, campaign authority,
PostgreSQL readiness or Gate C readiness has changed.

## Historical predecessor bindings

| Binding | Exact value |
|---|---|
| Inspect-Missing Correction Addendum / Review | `sha256:a43fbb5ac8e795ab6b6bf51507d3489c9e803161419af50179d7f7e9bed97505` / `sha256:ed73deb10f3ec9dcd5501f6d25f40ec7b140838494521ddd4cc9574b95afe324` |
| Kic HEAD / tree / G2 | `1e93280bc3842d40e6f797a38ca4bfa2a2277813` / `14526ed95feae2da6c9c14a89ece48616822e4e8` / `sha256:5dea77a0e5391f3283caab8a9b1d67f4a6ed8758be6be3631bad5283ca530f1f` |
| Concurrency Addendum SHA / HEAD / tree | `sha256:f18dce72f2a53ce11e530499156852e815c132093962ab7bdd5cee6dec587ae7` / `e21c441a6154f3c08b96ccbf7f0f7b693107b99a` / `8860d06a9ccc821be62bf62ee79cd356b8b7fb52` |
| Concurrency Review SHA / HEAD / tree | `sha256:310c408393dc7aff38c935137f89690096869b3259c3e28bc03325b4dfd225c7` / `9f178918c416bd3be54e4cbc44e0c64567a78ca1` / `63e69b5594aa9ba6627b825b1ac4aa636e15605e` |
| Kgc HEAD / tree / G2 | `98392bf19356982c884961a1425cd97ff33811bf` / `796684556d04368c3acd3926d0c86992affa205c` / `sha256:0101d889a77749a0671e26490bf2bb8a1aeab14b8678ce54d959a250388f83b4` |
| Lic HEAD / tree / G3 | `614202e8765372755f75ce7fa465ef9e550971a8` / `180d6a9fa048e07e72ddbab8e2e4e2e354fb902a` / `sha256:1dd72f64a6683a50e4f606a9601ab94d674a8b9757082f4318a2b532bec15d39` |
| Mic HEAD / tree / G10 | `eb209d314a1084069a15fd4c819cf5e4d5760b77` / `09e95f7d13873303dff81fcf5ec29433c8e589dd` / `sha256:c088d756b29f330dc31f626ab9fa4a33984f7c4afa92213c5f2c122349624cb5` |
| Kvt HEAD / tree / G2 | `85096f689ed89fef97c7781c2d84d813097cadae` / `1af3bea05f683863c5e93ecd4351bfcd2dbbf499` / `sha256:85c3882e4bdd18cb05432712e643cd68485a0a6693a95671d72cad0a36c398bf` |
| Lvt HEAD / tree / G3 | `27540be8753424b841a79b785bfa658911cbfbb1` / `a978e0ba70d69844242cf7b0ca627c861091e89a` / `sha256:e9b439cb6fbafa339991ea6cb56a59efb3eba1273633b399da57dc4986ba417f` |
| artifact index | `sha256:9a2cce7c176694be205abedd6d3ef5775e345ed7f8871e4b0631c08ad7d99929` |
| strict evidence schema | `sha256:31e54f83927a514fe8392c689e9cf1f4105d2b4021ed91a7c0959944992dee7f` |
| machine evidence | `sha256:4d469990dd17fefe0478e280c6d4c998a8a5e6058ac3089c4fa496cd7aff5e80` |
| construction report | `sha256:e449db8b2a94ea03a16545206e491f78069555bee1bfe7c9b67619ac627cef07` |
| committed Kic / Kgc / Lic audits | `sha256:7c1ea06b0f7c1422b29ef6eba6a92a063d1e6495e3d7a5cb6adccd535b1bd094` / `sha256:aeb46997b467b5471f484de08c543b061e0caed398d9aa6c83200203252f231f` / `sha256:3623dafd4f988503955b64206fe7bb292787de7c864ea38bcd5f4f9f5f9dd9e6` |
| Image-Manifest Correction Addendum / Review | `sha256:3791266f7cabf352d66ffafc00e9d3b6bd9db679818b172fc9f0423d26a1cdee` / `sha256:3af0c155276d6c7946ffb4c5196c61c38067b831e12de41c00c95c249df6b9c4` |
| Kmd HEAD / tree / G2 | `32abce27f7c84a83e0d2d1252ab0da5530f88cb0` / `eeaceeda818e7df76effe8b1439be849c7ead86b` / `sha256:a795d00b5875acedc13a320687c660f4c7c475ecf8e54373b6d55ca5e0de053e` |
| Lmd HEAD / tree / G3 | `b17a44f34fa9abde1e6a39504594e875a6d7d7cf` / `2609248dfc6d792c4d36947ff4bd857faaa745cf` / `sha256:a4ff525649dfd622d4171974ed3b43da863c8918e81aad08b546a5a32d00e161` |
| Image-Manifest index / schema / evidence / report | `sha256:7fd9ab11d2fa7435f13c316f33eda9bedc89a7fccd64b7df22b55a7bb020633c` / `sha256:83888dc57ec378d04bba5872de443e6e06170a159524ccb8b74966c51a971440` / `sha256:2d66f47aa0f96e65abec303eeaa4988a8e19f51381b6d1241737c68ae5ec9011` / `sha256:490256a560bb3b910d38214c9190365ac64b087100cb3d17bd7ced353f631559` |
| Image-Acquisition Correction Addendum / Review | `sha256:592f9e2fdb080a3f9605937251943afd2fb2f822c2871b04ae9d13c581d35b6e` / `sha256:83305354bc03c0fd1a3e945b04d4ceb6d5749f08e2c530f734502dc6921ed3a9` |
| Kiad HEAD / tree / G2 | `c6fe1804b1111c19d27da64f7ca76b85c0f12adf` / `3d9202f81cb09dfe9f1a6d70fb7cfb92f47cdb7a` / `sha256:d7f76c1a9af05f25952a65c5e561fa28186df390ac5a66c3416b45ca496b19f8` |
| Liad HEAD / tree / G3 | `95197de9f65469cb52e569245cf4e08190c82471` / `872cbc1fb4c0ea05bcf852ae0cc2d4c50d6469e7` / `sha256:11131eb2354616482e689fb3fc082d1ac33c7aea2ff8133e57101ac6d5a7922b` |
| Image-Acquisition index / schema / evidence / report | `sha256:8da9ebd53e26c91de44ad277db00b5d25b22aa1e3d262dd3db0e9bb7a8bb82e9` / `sha256:2aecd08011be498edef3f7da1f27c8fc00850701183325f09dbec9fc4d7f7170` / `sha256:2b0a029f48e74fb9c1d7f3b5878465b40861cfa8c45528e9a68e5cbbd8cb74f7` / `sha256:16ed0f8a78e141063f9943e42c5a8f02e14ad1da4008d576ac788614ba8d0e11` |
| Replacement Addendum / Review | `sha256:dd685d694d8ba6a4b14eca1202e3ee4710bf127242591fef0aec30af18d0033f` / `sha256:62bf1aa8865202980a8ea2fe22e0ca40993aec43752f9f6b5acfa9d29e8cbcda` |
| Kiar HEAD / tree / G2 | `3db30607077a1c4fd2aeb87fcf8c9f6d7dfa31cf` / `9457a111e646ca869f403d3020986e5e8b63a63b` / `sha256:2cca6a811e52df19942fc1b34ae38b66b12f8a5e548aa4defac39cb10159b2ae` |
| Liar HEAD / tree / G3 | `3e1b0cbd5394a2e3452ecb2ef9c0081c72381d9f` / `9999efe25b0c79e8d388b86b82a57297f0ff2533` / `sha256:fc167a02ce82f20fed05ffcf4b666dfc91eb5694553f3f6730c24c1b41c356db` |
| Replacement index / schema / evidence / report | `sha256:f37fd3adccb7b540aaa0ff180237d892b78c1e27f2c64d9686c3f0ff0577c8b3` / `sha256:7712430fed5f4feb6e8f53daf53b9aa11ba5046e2f625b2f865fed35880a6130` / `sha256:202e96b8d30a5f4e9e4074415388ddf73c133ceb9101733d8d36db61dc353f88` / `sha256:2750f690996e2c9e706af312e12832bc833406f0433651e1078522c70d58d156` |

The future local-effect proposal may use only these versioned add-only paths:

- `R4-PUBLIC-CORE-LOCAL-POSTGRES-INTEGRATION-CAMPAIGN-IMAGE-ACQUISITION-DIAGNOSTIC-CARD-V2.md`;
- `R4-PUBLIC-CORE-LOCAL-POSTGRES-INTEGRATION-CAMPAIGN-IMAGE-ACQUISITION-DIAGNOSTIC-OWNER-REVIEW-V2.md`.

They are not Gate C authority. They may authorize only one disposable local
diagnostic after a separate exact Owner decision.

## Frozen failed history

| History | Exact binding |
|---|---|
| physical grant / evidence / journal | `sha256:a4f782b8da35b8a2afe7d881b87949326e50f81b0493e2e7ea3dfc70dfc5ba35` / `sha256:b3de0db43bf85ead32019266c73d9e9c397f8c7c576f2e5284b8496e980f985c` / `34` / `sha256:2efe5233f94b9f57f17c08aaa792adb2c2353ee75f03ee326b16dcdcd4f10a25` |
| rescue grant / evidence / journal | `sha256:fc0af89348695275b789c17578fc3c856e150a42f999ba1efdc6e05d62889654` / `sha256:b138dcff20f1085cb8f237c505d6b2a8bb760926981cf4eef325a6e3b213a979` / `6` / `sha256:e4c8e688464ad9ec6ac897be68d537e558c31ab505e4151e0458767265f84491` |
| failed Diagnostic V1 Card / Review / payload | `sha256:1cd345018dc6ddbf393df873bca01a54fcb75f8e608f9f63a48c9f61fd06319e` / `sha256:324af94569b0c54456e474230bc06b3e7f15573ee97ec4a46c5886d56969abed` / `sha256:53188dac86131bf4910f06dc8dd64e7f1127d29cd55f21882960ab674a24262d` |
| failed Image-Acquisition V1 Card / Review / payload | `sha256:385f82e5ffd19745da495b5ed6e1f57e33020d5ed71df84ac591b2eb93880a72` / `sha256:8da2273700d37e588f943194d5a9c2e2d407ad4a75ac22ca3c3b5a58b449675c` / `sha256:fe44f267ac9663919a4e63ab075ed85a40bdf48b4128cdffaeed52fb107ec7ea` |
| failed Image-Acquisition V1 grant / evidence / journal | `sha256:76800f6b88c8e024d9ee3e527e3bf285c3163ae39360c903f698547b7cbbb7ba` / `sha256:d1364db823a82d44da0b36044a66538ba47ff5027980843ea65dc69e3dad4afd` / `7` / `sha256:0b2f01174fd8ad418f77558db3acae420278e7afb8ea259d6a76fbbb8309b6aa` |

None can be revived, retried or interpreted as campaign authority.

## Readiness matrix

| Requirement | Current value |
|---|---:|
| campaign runner, grant, journal and receipt constructed | `true` |
| body-free diagnostic classifier constructed | `true` |
| exact-ownership cleanup guard constructed | `true` |
| durable absence-before-physical gate constructed | `true` |
| write-ahead/clock/host/headroom/recovery guards constructed | `true` |
| image-acquisition diagnostic contract constructed | `true` |
| focused image-acquisition diagnostic tests | `6 / 6` |
| local PostgreSQL runner | `188 / 188` |
| complete offline regression | `760 / 760` |
| Gate-B Core validation | `146 / 146` |
| spine | `45 / 45` |
| failed V1 image-acquisition diagnostic approved / executed | `true / true` |
| replacement V2 diagnostic approved / executed | `false / false` |
| image pull / cleanup authorized | `false / false` |
| historical resources observed absent by consumed V2 campaign | `true` |
| target PostgreSQL / catalog observed | `false / false` |
| disposable physical Green | `false` |
| production pool / migration | `false / false` |
| runtime route / public traffic | `false / false` |
| one real Guest encounter accepted | `false` |
| Gate C ready | `false` |

## Current zero-effect boundary

Replacement construction made one body-free read of the retained V1 root and
no mutation. It made no replacement grant,
Docker/socket/OCI call, PostgreSQL process/connection/database/SQL effect,
production database/runtime/Room/Projection/Curator/Guest effect, Provider,
message, traffic, deployment, publication, admission, release, Gate C action,
push, PR mutation, merge or spend.

## What must happen before Gate C can become approvable

1. Construct and independently audit the versioned V2 Image-Acquisition Diagnostic
   Card/Owner Review, then obtain a separate exact Owner approval.
2. Under that one-use authority only, use the cached path or at most one exact
   anonymous pull and observe the bounded typed descriptor tuple, with no
   Docker resource, cleanup or PostgreSQL effect.
3. Review the observed tuple and, if justified, construct a separate repository
   correction plus a new replacement-campaign authority; neither is implied by
   the diagnostic result.
4. Under that later one-use campaign authority only, reach complete Green: historical
   resource absence, PostgreSQL `160010`, target catalog `14 / 207 / 172 / 44`,
   the frozen `3 / 3 / 1` schema sequence, `23 / 20` actions and zero owned
   residue.
5. Bind production credentials, pool, migration, runtime route, traffic and
   exact product authority in a later Gate C proposal.
6. Run and Owner-accept one real bounded Guest encounter.

No local campaign outcome automatically opens production or marks #67/R4 Done.

## Mandatory stop

`LOCAL_POSTGRES_INTEGRATION_CAMPAIGN_V4_FAILED_CLEAN / LOCAL_LIFECYCLE_BUDGET_EXHAUSTED / NEW_OWNER_DECISION_REQUIRED / PRODUCTION_NOT_REQUESTED / GATE_C_NOT_REQUESTED`

Gate C remains intentionally non-approvable.
