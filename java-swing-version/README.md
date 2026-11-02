# CLAIMBACK (Core Java Swing Version)

This directory contains the complete Core Java & Java Swing desktop application as specified by the CLAIMBACK PRD.

## Package Structure
```
claimback/
├── Main.java
├── model/
│   ├── Product.java
│   └── WarrantyStatus.java
├── service/
│   ├── ProductService.java
│   └── WarrantyService.java
├── repository/
│   └── ProductRepository.java
├── ui/
│   ├── MainFrame.java
│   ├── DashboardPanel.java
│   ├── ProductListPanel.java
│   ├── ProductFormDialog.java
│   └── ProductDetailsDialog.java
└── util/
    ├── InputValidator.java
    └── IdGenerator.java
```

## How to Compile & Run

### Prerequisites
- JDK 17 or higher (`javac` and `java` on PATH)

### Compile
```bash
cd java-swing-version
javac -d bin src/claimback/model/*.java src/claimback/util/*.java src/claimback/service/*.java src/claimback/repository/*.java src/claimback/ui/*.java src/claimback/Main.java
```

### Run
```bash
java -cp bin claimback.Main
```

### IDE Setup
Open the `java-swing-version` folder in IntelliJ IDEA, Eclipse, or VS Code, ensure `src` is marked as the Source Root, and run `claimback.Main`.
