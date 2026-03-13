package com.kavyapharm.farmatrack.mrlocation.model;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

import java.time.Instant;

@Entity
@Table(name = "app_mr_location")
public class MrLocation {

    @Id
    private Long mrId;

    @Column(nullable = false)
    private String mrName;

    private String territory;

    @Column(nullable = false)
    private Double latitude;

    @Column(nullable = false)
    private Double longitude;

    private Double accuracy;

    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt;

    public MrLocation() {
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

    public String getTerritory() {
        return territory;
    }

    public void setTerritory(String territory) {
        this.territory = territory;
    }

    public Double getLatitude() {
        return latitude;
    }

    public void setLatitude(Double latitude) {
        this.latitude = latitude;
    }

    public Double getLongitude() {
        return longitude;
    }

    public void setLongitude(Double longitude) {
        this.longitude = longitude;
    }

    public Double getAccuracy() {
        return accuracy;
    }

    public void setAccuracy(Double accuracy) {
        this.accuracy = accuracy;
    }

    public Instant getUpdatedAt() {
        return updatedAt;
    }

    public void setUpdatedAt(Instant updatedAt) {
        this.updatedAt = updatedAt;
    }
}
