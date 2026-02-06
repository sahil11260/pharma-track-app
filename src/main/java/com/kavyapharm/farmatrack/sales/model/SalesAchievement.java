package com.kavyapharm.farmatrack.sales.model;

import jakarta.persistence.*;
import java.time.LocalDate;

@Entity
@Table(name = "sales_achievements")
public class SalesAchievement {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "mr_id", nullable = false)
    private Long mrId;

    @Column(name = "mr_name", nullable = false)
    private String mrName;

    @Column(name = "product_id")
    private Long productId;

    @Column(name = "product_name", nullable = false)
    private String productName;

    @Column(name = "achieved_units", nullable = false)
    private Integer achievedUnits;

    @Column(name = "achievement_date", nullable = false)
    private LocalDate achievementDate;

    @Column(name = "period_month", nullable = false)
    private Integer periodMonth;

    @Column(name = "period_year", nullable = false)
    private Integer periodYear;

    @Column(name = "remarks")
    private String remarks;

    // Constructors
    public SalesAchievement() {
        this.achievementDate = LocalDate.now();
    }

    // Getters and Setters
    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public Long getMrId() {
        return mrId;
    }

    public void setMrId(Long mrId) {
        this.mrId = mrId;
    }

    public String getMrName() {
        return mrName;
    }

    public void setMrName(String mrName) {
        this.mrName = mrName;
    }

    public Long getProductId() {
        return productId;
    }

    public void setProductId(Long productId) {
        this.productId = productId;
    }

    public String getProductName() {
        return productName;
    }

    public void setProductName(String productName) {
        this.productName = productName;
    }

    public Integer getAchievedUnits() {
        return achievedUnits;
    }

    public void setAchievedUnits(Integer achievedUnits) {
        this.achievedUnits = achievedUnits;
    }

    public LocalDate getAchievementDate() {
        return achievementDate;
    }

    public void setAchievementDate(LocalDate achievementDate) {
        this.achievementDate = achievementDate;
    }

    public Integer getPeriodMonth() {
        return periodMonth;
    }

    public void setPeriodMonth(Integer periodMonth) {
        this.periodMonth = periodMonth;
    }

    public Integer getPeriodYear() {
        return periodYear;
    }

    public void setPeriodYear(Integer periodYear) {
        this.periodYear = periodYear;
    }

    public String getRemarks() {
        return remarks;
    }

    public void setRemarks(String remarks) {
        this.remarks = remarks;
    }
}
