# Hierarchical Accounting Groups

The accounting transformation records view is organized as:

1. Record source/type (Model B or Legacy)
2. Main classification
3. Sub-classification
4. Accounting group
5. Asset records loaded lazily per leaf group

The hierarchy API returns summary counts and progress metrics. Asset cards are fetched only when a leaf group is expanded.
