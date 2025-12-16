library(data.table)
library(MOFA2)
library(Matrix)
library(ggplot2)

# -------------------------
# 2) File paths (from your message)
# -------------------------
paths <- list(
  CNV  = "C:/RHEA/S8/Project/Code/MOFA integration/copy number (gene-level) - gene-level copy number (gistic2_thresholded)/Gistic2_CopyNumber_Gistic2_all_thresholded.by_genes",
  METH = "C:/RHEA/S8/Project/Code/MOFA integration/DNA methylation - DNA methylation (Methylation450K)/jhu-usc.edu_PANCAN_HumanMethylation450.betaValue_whitelisted.tsv.synapse_download_5096262.xena",
  RNA  = "C:/RHEA/S8/Project/Code/MOFA integration/gene expression RNAseq - Batch effects normalized mRNA data/EB++AdjustPANCAN_IlluminaHiSeq_RNASeqV2.geneExp.xena",
  MIR  = "C:/RHEA/S8/Project/Code/MOFA integration/miRNA mature strand expression - Batch effects normalized miRNA data/pancanMiRs_EBadjOnProtocolPlatformWithoutRepsWithUnCorrectMiRs_08_04_16.xena",
  MUT  = "C:/RHEA/S8/Project/Code/MOFA integration/somatic mutation (SNP and INDEL) - Gene level non-silent mutation/mc3.v0.2.8.PUBLIC.nonsilentGene.xena",
  CLIN = "C:/RHEA/S8/Project/Code/MOFA integration/phenotype - Curated clinical data"
)

# -------------------------
# 3) Generic loader (detects delimiter, handles header first column as gene names)
#    Returns matrix: rows=features, cols=samples (if it was transposed it fixes it)
# -------------------------
load_xena_like <- function(file, require_numeric = TRUE) {
  message("Loading: ", file)
  # data.table::fread guesses delimiter; use fill=TRUE for ragged files
  dt <- tryCatch(fread(file, data.table = FALSE, fill = TRUE, showProgress = FALSE),
                 error = function(e) stop("Failed to read: ", file, "\n", e$message))
  # If first column looks like gene names (non-numeric), set as rownames
  if (ncol(dt) >= 2 && !all(sapply(dt[,1], function(x) { !is.na(as.numeric(x)) }))) {
    rn <- as.character(dt[,1])
    dt <- dt[ , -1, drop = FALSE]
    rownames(dt) <- rn
  }
  mat <- as.matrix(dt)
  # If matrix is numeric in columns or rows? We want features (rows) x samples (cols).
  # Check which orientation yields sample-like column names (TCGA IDs usually contain '-')
  col_has_tcga <- any(grepl("TCGA", colnames(mat)))
  row_has_tcga <- any(grepl("TCGA", rownames(mat)))
  if (!col_has_tcga && row_has_tcga) {
    message("Transposing because TCGA IDs found in rownames")
    mat <- t(mat)
  }
  # Ensure numeric matrix where possible
  if (require_numeric) {
    mat <- apply(mat, 2, function(x) as.numeric(as.character(x)))
    rownames(mat) <- rownames(dt)  # reassign feature names if needed
    colnames(mat) <- colnames(dt)
  }
  return(mat)
}


# -------------------------
# 4) Load each view
# -------------------------
cnv_raw  <- load_xena_like(paths$CNV)
meth_raw <- load_xena_like(paths$METH)
rna_raw  <- load_xena_like(paths$RNA)
mir_raw  <- load_xena_like(paths$MIR)
mut_raw  <- load_xena_like(paths$MUT)
# Clinical – load but keep as data.frame (rows = samples)
clin_raw <- tryCatch(fread(paths$CLIN, data.table = FALSE, fill = TRUE, showProgress = FALSE),
                     error = function(e) stop("Failed to read clinical file: ", e$message))
# Make sure clinical sample IDs are in a column – common header names: sample, sample_id, tcga_id
clin_colname <- intersect(c("sample","sample_id","sampleID","bcr_patient_barcode","submitter_id.samples"), tolower(colnames(clin_raw)))
if (length(clin_colname) == 0) {
  # Try heuristic: find any column with TCGA-like IDs
  tcga_col <- which(sapply(clin_raw, function(col) any(grepl("TCGA", col))))
  if (length(tcga_col) >= 1) {
    clin_id_col <- colnames(clin_raw)[tcga_col[1]]
  } else {
    clin_id_col <- colnames(clin_raw)[1]
  }
} else {
  clin_id_col <- colnames(clin_raw)[which(tolower(colnames(clin_raw)) == clin_colname[1])]
}
# standardize clinical sample ID column name
colnames(clin_raw)[which(colnames(clin_raw) == clin_id_col)] <- "sampleID"
