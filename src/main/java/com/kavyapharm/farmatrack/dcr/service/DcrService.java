package com.kavyapharm.farmatrack.dcr.service;

import com.kavyapharm.farmatrack.dcr.dto.CreateDcrRequest;
import com.kavyapharm.farmatrack.dcr.dto.DcrResponse;
import com.kavyapharm.farmatrack.dcr.dto.DcrSampleItemRequest;
import com.kavyapharm.farmatrack.dcr.dto.DcrSampleItemResponse;
import com.kavyapharm.farmatrack.dcr.dto.UpdateDcrRequest;
import com.kavyapharm.farmatrack.dcr.model.DcrReport;
import com.kavyapharm.farmatrack.dcr.model.DcrSampleItem;
import com.kavyapharm.farmatrack.dcr.repository.DcrRepository;
import com.kavyapharm.farmatrack.doctor.repository.DoctorRepository;
import com.kavyapharm.farmatrack.mrstock.service.MrStockService;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import java.util.Objects;

@Service
public class DcrService {

    private final DcrRepository dcrRepository;
    private final MrStockService mrStockService;
    private final DoctorRepository doctorRepository;

    public DcrService(DcrRepository dcrRepository, MrStockService mrStockService, DoctorRepository doctorRepository) {
        this.dcrRepository = dcrRepository;
        this.mrStockService = mrStockService;
        this.doctorRepository = doctorRepository;
    }

    public List<DcrResponse> list() {
        return dcrRepository.findAll(Sort.by(Sort.Direction.DESC, "reportId"))
                .stream().map(this::toResponse).toList();
    }

    public List<DcrResponse> listByMr(String mrName) {
        return dcrRepository.findByMrNameIgnoreCase(mrName, Sort.by(Sort.Direction.DESC, "reportId"))
                .stream()
                .map(this::toResponse).toList();
    }

    public DcrResponse get(Long reportId) {
        Objects.requireNonNull(reportId, "reportId is required");
        return toResponse(getEntity(reportId));
    }

    @Transactional
    public DcrResponse create(CreateDcrRequest request) {
        long reportId = System.currentTimeMillis();

        DcrReport report = new DcrReport();
        report.setReportId(reportId);
        report.setMrName(request.mrName());
        applyFields(report, request.visitTitle(), request.visitType(), request.doctorId(), request.doctorName(),
                request.clinicLocation(), request.dateTime(), request.rating(), request.remarks(),
                request.samplesGiven());

        // Fetch and set region from doctor profile
        try {
            String docIdStr = request.doctorId();
            if (docIdStr != null && docIdStr.matches("\\d+")) {
                doctorRepository.findById(Long.parseLong(docIdStr)).ifPresent(d -> report.setRegion(d.getCity()));
            } else if (request.doctorName() != null) {
                doctorRepository.findByNameIgnoreCase(request.doctorName())
                        .ifPresent(d -> report.setRegion(d.getCity()));
            }
        } catch (Exception e) {
            // Fallback
        }

        report.setSubmissionTime(Instant.now().toString());

        deductStock(report.getMrName(), report.getSamplesGiven());

        return toResponse(dcrRepository.save(report));
    }

    @Transactional
    public DcrResponse update(Long reportId, UpdateDcrRequest request) {
        Objects.requireNonNull(reportId, "reportId is required");
        DcrReport existing = getEntity(reportId);

        refundStock(existing.getMrName(), existing.getSamplesGiven());

        applyFields(existing, request.visitTitle(), request.visitType(), request.doctorId(), request.doctorName(),
                request.clinicLocation(), request.dateTime(), request.rating(), request.remarks(),
                request.samplesGiven());

        // Fetch and set region from doctor profile
        try {
            String docIdStr = request.doctorId();
            if (docIdStr != null && docIdStr.matches("\\d+")) {
                doctorRepository.findById(Long.parseLong(docIdStr)).ifPresent(d -> existing.setRegion(d.getCity()));
            } else if (request.doctorName() != null) {
                doctorRepository.findByNameIgnoreCase(request.doctorName())
                        .ifPresent(d -> existing.setRegion(d.getCity()));
            }
        } catch (Exception e) {
            // Fallback
        }

        existing.setSubmissionTime(Instant.now().toString());

        deductStock(existing.getMrName(), existing.getSamplesGiven());

        return toResponse(dcrRepository.save(existing));
    }

    @Transactional
    public void delete(Long reportId) {
        Objects.requireNonNull(reportId, "reportId is required");
        if (!dcrRepository.existsById(reportId)) {
            return;
        }

        DcrReport existing = getEntity(reportId);
        refundStock(existing.getMrName(), existing.getSamplesGiven());
        dcrRepository.deleteById(reportId);
    }

    private void refundStock(String mrName, List<DcrSampleItem> items) {
        if (items == null || mrName == null) {
            return;
        }
        for (DcrSampleItem item : items) {
            if (item == null || item.getQuantity() == null) {
                continue;
            }
            int qty = item.getQuantity();
            if (qty <= 0) {
                continue;
            }
            mrStockService.adjustStockOrThrow(item.getProductId(), mrName, qty);
        }
    }

    private void deductStock(String mrName, List<DcrSampleItem> items) {
        if (items == null || mrName == null) {
            return;
        }
        for (DcrSampleItem item : items) {
            if (item == null || item.getQuantity() == null) {
                continue;
            }
            int qty = item.getQuantity();
            if (qty <= 0) {
                continue;
            }
            mrStockService.adjustStockOrThrow(item.getProductId(), mrName, -qty);
        }
    }

    private void applyFields(
            DcrReport report,
            String visitTitle,
            String visitType,
            String doctorId,
            String doctorName,
            String clinicLocation,
            String dateTime,
            String rating,
            String remarks,
            List<DcrSampleItemRequest> samplesGiven) {
        report.setVisitTitle(visitTitle);
        report.setVisitType(visitType);
        report.setDoctorId(doctorId);
        report.setDoctorName(doctorName);
        report.setClinicLocation(clinicLocation);
        report.setDateTime(dateTime);
        report.setRating(rating);
        report.setRemarks(remarks);

        List<DcrSampleItem> mapped = new ArrayList<>();
        if (samplesGiven != null) {
            for (DcrSampleItemRequest req : samplesGiven) {
                if (req == null) {
                    continue;
                }
                DcrSampleItem item = new DcrSampleItem();
                item.setProductId(req.productId());
                item.setProductName(req.productName());
                item.setQuantity(req.quantity() == null ? 0 : req.quantity());
                mapped.add(item);
            }
        }
        report.setSamplesGiven(mapped);
    }

    private DcrReport getEntity(Long reportId) {
        Objects.requireNonNull(reportId, "reportId is required");
        return dcrRepository.findById(reportId)
                .orElseThrow(() -> new IllegalArgumentException("DCR not found"));
    }

    public DcrResponse toResponse(DcrReport report) {
        List<DcrSampleItemResponse> samples = report.getSamplesGiven() == null
                ? List.of()
                : report.getSamplesGiven().stream().filter(Objects::nonNull)
                        .map(i -> new DcrSampleItemResponse(i.getProductId(), i.getProductName(), i.getQuantity()))
                        .toList();

        // Dynamic fallback for missing region in legacy data
        String region = report.getRegion();
        if (region == null || region.isBlank() || "-".equals(region)) {
            try {
                String docIdStr = report.getDoctorId();
                if (docIdStr != null && docIdStr.matches("\\d+")) {
                    region = doctorRepository.findById(Long.parseLong(docIdStr)).map(d -> d.getCity()).orElse(null);
                }

                if (region == null && report.getDoctorName() != null) {
                    region = doctorRepository.findByNameIgnoreCase(report.getDoctorName()).map(d -> d.getCity())
                            .orElse(null);
                }

                if (region == null) {
                    region = report.getClinicLocation();
                }
            } catch (Exception e) {
                region = report.getClinicLocation();
            }
        }

        return new DcrResponse(
                report.getReportId(),
                report.getMrName(),
                report.getVisitTitle(),
                report.getVisitType(),
                report.getDoctorId(),
                report.getDoctorName(),
                report.getClinicLocation(),
                report.getDateTime(),
                report.getRating(),
                report.getRemarks(),
                region,
                samples,
                report.getSubmissionTime());
    }
}
