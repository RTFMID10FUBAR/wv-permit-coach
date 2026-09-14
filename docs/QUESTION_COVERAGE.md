# Question Coverage

Generated 2026-09-14 by `tools/gen_coverage.py` — do not edit by hand.

**316 questions** · 134 concepts · 33 lessons · 33 topics · 13 signs


## By handbook chapter

| Chapter | Title | Printed pages | Questions | Pages cited | Status |
|---|---|---|---|---|---|
| I | Driver's License Information | 1–15 | 0 | — | **NOT COVERED** |
| II | Driver Responsibilities | 16–20 | 0 | — | **NOT COVERED** |
| III | Driving Impaired or Under the Influence | 21–23 | 28 | 3 of 3 | covered |
| IV | Examination Procedures and Requirements | 24–33 | 0 | — | **NOT COVERED** |
| V | Traffic Control Devices | 34–41 | 80 | 8 of 8 | covered |
| VI | Traffic Laws and Rules of the Road | 42–56 | 116 | 13 of 15 | covered |
| VII | Driving on Interstates | 57–60 | 0 | — | **NOT COVERED** |
| VIII | Defensive Driving | 61–69 | 54 | 6 of 9 | covered |
| IX | Emergency Situations | 70–77 | 38 | 5 of 8 | covered |

## By topic

| Topic | Chapter | Concepts | Lessons | Questions | Exam weight |
|---|---|---|---|---|---|
| Alcohol and Your Driving | III | 5 | 1 | 10 | 1.2 |
| WV Alcohol Laws and DUI | III | 7 | 1 | 14 | 1.4 |
| Drugs and Drowsy Driving | III | 2 | 1 | 4 | 1.0 |
| Sign Shapes and What They Mean | V | 6 | 1 | 15 | 3.0 |
| Regulatory Signs: Squares and Rectangles | V | 3 | 1 | 7 | 2.0 |
| Yellow Diamond Warning Signs | V | 2 | 1 | 4 | 2.0 |
| Construction and Work Zones | V | 1 | 1 | 3 | 1.0 |
| Guide Signs and Route Markers | V | 1 | 1 | 3 | 1.0 |
| Railroad Crossings | V | 3 | 1 | 8 | 2.0 |
| Traffic Lights | V | 5 | 1 | 15 | 3.0 |
| Flashers, Lane and Crosswalk Signals | V | 3 | 1 | 7 | 2.0 |
| Pavement Markings | V | 7 | 1 | 18 | 2.0 |
| Speed Limits and the Basic Speed Law | VI | 3 | 1 | 9 | 2.0 |
| Signalling and Turning | VI | 4 | 1 | 12 | 2.0 |
| Turning Around and Backing Up | VI | 2 | 1 | 5 | 1.0 |
| Parking Rules | VI | 4 | 1 | 12 | 1.5 |
| Following Distance | VI | 2 | 1 | 6 | 2.0 |
| Changing Lanes and Passing | VI | 3 | 1 | 10 | 2.0 |
| Right-of-Way | VI | 6 | 1 | 13 | 3.0 |
| Sharing the Road with Pedestrians | VI | 2 | 1 | 5 | 2.0 |
| School Bus Rules | VI | 4 | 1 | 9 | 2.5 |
| Headlights and Tailgating | VI | 3 | 1 | 8 | 1.5 |
| Motorcycles and Slow Vehicles | VI | 2 | 1 | 6 | 1.5 |
| Sharing the Road with Heavy Trucks | VI | 3 | 1 | 8 | 1.5 |
| Bicycles, Animals and Other Road Users | VI | 5 | 1 | 13 | 1.5 |
| Good and Bad Driving Habits | VIII | 5 | 1 | 12 | 1.0 |
| Light Conditions and Night Driving | VIII | 5 | 1 | 10 | 1.3 |
| Rain, Snow, Fog and Flooding | VIII | 8 | 1 | 16 | 1.4 |
| Vehicle and Driver Condition | VIII | 5 | 1 | 10 | 1.0 |
| Traffic Situations and Passing | VIII | 4 | 1 | 6 | 1.2 |
| Checking Your Vehicle | IX | 3 | 1 | 6 | 0.8 |
| When Something Fails While Driving | IX | 9 | 1 | 18 | 1.3 |
| If You Are in a Crash | IX | 7 | 1 | 14 | 1.2 |

## Question mix

A concept tested only one way can be answered from memory of that one question. The spread below is the anti-memorisation guarantee.

| Question type | Count |
|---|---|
| direct | 122 |
| scenario | 77 |
| application | 44 |
| negative | 36 |
| reversed | 28 |
| sign | 9 |

| Difficulty | Count |
|---|---|
| moderate | 165 |
| core | 116 |
| tricky | 35 |

## Gaps and thin coverage

- **Chapter I (Driver's License Information) has no questions.**
- **Chapter II (Driver Responsibilities) has no questions.**
- **Chapter IV (Examination Procedures and Requirements) has no questions.**
- **Chapter VII (Driving on Interstates) has no questions.**

## How to verify

```bash
python3 tools/merge_content.py && python3 tools/validate_content.py
python3 tools/gen_coverage.py
```

`validate_content.py` asserts that every `sourceQuote` appears verbatim on the handbook page it cites. See `docs/SOURCE_AUDIT.md`.
